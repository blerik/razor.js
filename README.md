# razor.js - reverse {{mustache}} templating

> A {{mustache}} is nice, but sometimes you're just itching for a razor...

Introducing razor.js, a reverse {{[mustache](http://github.com/janl/mustache.js)}} templater. Mustache allows you to turn a view model into a rendered view using a mustache template. Razor.js takes the same template and a rendered view, and returns the view model. This is useful for:
 - screen scraping
 - putting xml in its place

## Quick example

```js
var mustache = require('mustache');
var razor = require('./razor');

var template = 'foo{{bar}}baz';
// mustache calls this a view
var model = {
    bar: 'bar'
};

var rendering = mustache.render(template, model);

// now let's reverse it
var model2 = razor.getModel(template, rendering);

console.log('Did it work?', JSON.stringify(model) === JSON.stringify(model2));
```

## Screen scraping

If you can write a template for it, you can scrape it using razor. If you add [contenteditable](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_Editable) to your templates, you can create a simple editor for your view models:

```js
var template =
'<ul>' +
    '<li>Your name</li>' +
    '<li contenteditable="true">{{name}}</li>' +
    '<li>Your age</li>' +
    '<li contenteditable="true">{{age}}</li>' +
'</ul>';
var model = {
    name: 'Please enter your name here',
    age:  'Please enter your age here'
};

var form = mustache.render(template, model);
$('.form')
    .html(form)
    .on('blur', function() {
        model = razor.getModel(template, this);
    });
```

## Putting xml in its place

You probably used mustache already to create some xml to send to the server, right?... Just because xml is so horrible to work with in Javascript. Razor allows you to use the same templates you use for creating xml to also extract the json data from those xml files:

```js
var xml =
'<message>' +
    '<warning>' +
        'Hello World' +
    '</warning>' +
'</message>';
var template =
'<message>' +
    '<warning>{{warning}}</warning>' +
'</message>';

var model = razor.getModel(template, xml);
```

This is so simple when compared to other xml tooling, I would like to pose this adage:

> XML is just a view on the actual model, just like HTML.

## Limitations

The mustache transform throws away information in some cases. Razor cannot reconstruct this information. For example:

```js
// this works fine
var template = 'foo{{bar}}{{baz}}qux';
var model = {
    bar: 'bar',
    baz: 'baz'
};
var rendering = mustache.render(template, model);

// this does not
var model2 = razor.getModel(template, rendering);
```

This example doesn't work, because the mustache rendering doesn't show where the {{bar}} mustache ends and the {{baz}} mustache begins. So razor cannot find the model for this rendering.

Luckily, for most HTML and XML templates, this never happens. Just be mindful of this limitation when using razor.

