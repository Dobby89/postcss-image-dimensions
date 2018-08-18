const pluginName = 'postcss-image-data';
const fs = require('fs');
const globby = require('globby');
const jimp = require('jimp');
const isImage = require('is-image');
const roundPrecision = require('round-precision');
const { plugin } = require('postcss');
const LocalStorage = require('node-localstorage').LocalStorage;

let cachePath = './.cache';
let cache = null;
let globPattern = './src/images/**/*';
const methodMap = {
	'image-width': {
		pattern: /image-width\(['"]?(.+?)['"]?\)/,
		propertyName: 'width1x',
		suffix: 'px'
	},
	'image-width-2x': {
		pattern: /image-width-2x\(['"]?(.+?)['"]?\)/,
		propertyName: 'width2x',
		suffix: 'px'
	},
	'image-width-ratio': {
		pattern: /image-width-ratio\(['"]?(.+?)['"]?\)/,
		propertyName: 'widthRatio1x',
		suffix: '%'
	},
	'image-width-ratio-2x': {
		pattern: /image-width-ratio-2x\(['"]?(.+?)['"]?\)/,
		propertyName: 'widthRatio2x',
		suffix: '%'
	},
	'image-height': {
		pattern: /image-height\(['"]?(.+?)['"]?\)/,
		propertyName: 'height1x',
		suffix: 'px'
	},
	'image-height-2x': {
		pattern: /image-height-2x\(['"]?(.+?)['"]?\)/,
		propertyName: 'height2x',
		suffix: 'px'
	},
	'image-height-ratio': {
		pattern: /image-height-ratio\(['"]?(.+?)['"]?\)/,
		propertyName: 'heightRatio1x',
		suffix: '%'
	},
	'image-height-ratio-2x': {
		pattern: /image-height-ratio-2x\(['"]?(.+?)['"]?\)/,
		propertyName: 'heightRatio2x',
		suffix: '%'
	},
	'image-colour': {
		pattern: /image-colour\(['"]?(.+?)['"]?\)/,
		propertyName: 'colour'
	}
};

function rgbToHex({ r, g, b }) {
	function convert(c) {
		const hex = c.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	}
	return '#' + convert(r) + convert(g) + convert(b);
}

async function buildImageData(filePath) {

	let absolutePath = filePath;
	if (filePath.startsWith('./')) {
		absolutePath = filePath.substr(2);
	}

	const fileStat = await fs.statSync(filePath);
	const imageData = {	path: absolutePath };

	// Retreive data from cache if exists
	const cacheKey = `${absolutePath.replace('.', '')}.json`;
	const cacheFilePath = `${cachePath}/${encodeURIComponent(absolutePath.replace('.', ''))}.json`;
	const imageDataCache = await fs.existsSync(cacheFilePath) ? cache.getItem(cacheKey) : null;
	const imageDataCacheMTime = imageDataCache ? await fs.statSync(cacheFilePath).mtime : null;

	return new Promise((resolve, reject) => {

		if (imageDataCache && Date.parse(imageDataCacheMTime) > Date.parse(fileStat.mtime)) {
			return resolve(JSON.parse(imageDataCache));
		}

		return jimp.read(filePath)
			.then(async img => {
				const { width, height } = img.bitmap;

				/**
				 * Set the non-retina dimensions by halfing dimensions
				 * and round up to nearest pixel. This seems to be the
				 * approach of Jimp, so we'll go with that.
				 */
				const width1x = Math.ceil(width / 2);
				const height1x = Math.ceil(height / 2);

				/**
				 * Get the "average colour" of the image by resizing down
				 * to a 1 x 1px and getting the colour of that pixel.
				 *
				 * TODO: Make this more accurate.
				 */
				const rgb = img.resize(1, 1, jimp.RESIZE_BICUBIC).getPixelColor(0, 0);
				const colour = rgb ? rgbToHex(jimp.intToRGBA(rgb)) : 'transparent';

				imageData.width1x = width1x;
				imageData.height1x = height1x;
				imageData.width2x = width;
				imageData.height2x = height;
				imageData.widthRatio1x = roundPrecision(width1x / height1x * 100, 4);
				imageData.widthRatio2x = roundPrecision(width / height * 100, 4);
				imageData.heightRatio1x = roundPrecision(height1x / width1x * 100, 4);
				imageData.heightRatio2x = roundPrecision(height / width * 100, 4);
				imageData.colour = colour;

				// Cache the image data
				cache.setItem(cacheKey, JSON.stringify(imageData));

				return resolve(imageData);
			});
	});
}

module.exports = plugin(pluginName, (options = {}) => {

	// Override any default configs
	globPattern = options.assetPaths || globPattern;
	cachePath = options.cachePath || cachePath;
	cache = new LocalStorage(cachePath);

	return async function(css) {

		const allImageData = await globby(globPattern).then(async files => {

			const imageFiles = files.filter(filePath => isImage(filePath));

			return await Promise.all(imageFiles.map(buildImageData)).then(imageData => {
				return imageData.reduce((acc, currentImage) => {

					// Use the image path as a unique ID of the image
					const imgPath = currentImage.path;

					delete currentImage.path;
					acc[imgPath] = currentImage;

					return acc;
				}, {});
			});
		});

		Object.keys(methodMap).forEach(method => {

			const helperConfig = methodMap[method];

			// http://api.postcss.org/Root.html#replaceValues
			css.replaceValues(helperConfig.pattern, { fast: method }, (string) => {
				const imagePath = string.match(helperConfig.pattern)[1];
				const imageData = allImageData[imagePath];

				try {
					if (imageData) {
						if (helperConfig.suffix) {
							return imageData[helperConfig.propertyName] + helperConfig.suffix;
						}
						return imageData[helperConfig.propertyName];
					}
					return string;
				} catch (error) {
					throw css.error(error.message, { plugin: pluginName });
				}
			});
		});
	};
});
