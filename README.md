# PostCSS Image Data

[PostCSS](https://github.com/postcss/postcss) plugin for using image width, height, ratio and colour data in your CSS.


## Features

* Image width and height
* Image size ratio (width:height and height:width)
* Average colour
* Caching

**Note:** All width, height and ratio helpers include a 2x resolution version. For example, `image-width()` becomes `image-width-2x()`. The assumption is that


## Usage

```.js
const postcssImageData = require('postcss-image-data');

postcss([postcssImageData([options])])
```


## CSS Example

```.css
/* Input */
.example-image {
    width: image-width('src/images/example.jpg');
}

/* Output */
.example-image {
    width: 200px;
}
```


## Available CSS helpers

* `image-width()` - Width in pixels.
* `image-width-2x()` - Width in pixels.
* `image-width-ratio()` - Ratio of width as a percentage (to 4 decimal places).
* `image-width-ratio-2x()` - Ratio of width as a percentage (to 4 decimal places).
* `image-height()` - Height in pixels.
* `image-height-2x()` - Height in pixels.
* `image-height-ratio()` - Ratio of height as a percentage (to 4 decimal places).
* `image-height-ratio-2x()` - Ratio of height as a percentage (to 4 decimal places).
* `image-colour()` - The average colour of the image as a HEX string.


## CSS helper examples

**Important**: All image paths used with the CSS helpers must be absolute from the root of your project.

All examples below assume the following image has been used.

![alt text](test/juice.jpg "Juice")

| Example Input | Example Output
| - | - |
| `image-width('test/juice.jpg')` | `125px` |
| `image-width-2x('test/juice.jpg')` | `250px` |
| `image-width-ratio('test/juice.jpg')` | `117.9245%` |
| `image-width-ratio-2x('test/juice.jpg')` | `118.4834%` |
| `image-height('test/juice.jpg')` | `106px` |
| `image-height-2x('test/juice.jpg')` | `211px` |
| `image-height-ratio('test/juice.jpg')` | `84.8%` |
| `image-height-ratio-2x('test/juice.jpg')` | `84.4%` |
| `image-colour('test/juice.jpg')` | `#cbbc8e` |


## API

### postcssImageData([options])

#### options.globPattern

* Type: String | Array
* Default value: `'./src/images/**/*'`

Override where the plugin should look for images. Paths need to be provided as glob patterns. See [globby](https://github.com/sindresorhus/globby) for supported patterns.

#### options.cachePath

* Type: String
* Default value: `'./.cache'`

The plugin creates a cache of all image data so it doesn't have to keep processing images each time.
