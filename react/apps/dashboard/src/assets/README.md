# The `assets` folder

Any content included in this folder should be static (fonts, css, images, etc). This content will be included in the final build, but a content hash will be appended to the filename. Many of our assets will need a hash in the filename so we can leverage client cache invalidation when assets change between releases.

If you have assets that are...

- Never referenced in source code (e.g. robots.txt)
- Must retain the exact same file name (without hashing)

... then you may want to consider using the `public` folder instead.
