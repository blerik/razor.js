(function(exports){

    var mustache = require('mustache');

    // simple tokener (doesn't understand {{= =}})
    var tokenize = exports.tokenize = function(text) {
        return text
            .replace(/{{{/g, '{{&')
            .replace(/}}}/g, '}}')
            .match(/{{[#^](.+?)}}[\w\W]+?{{\/\1}}|{{.+?}}|[\w\W]+?(?={{|$)/g);
    };

    var normalize = exports.normalize = function(xml) {
        return xml
            // whitespace at beginning / end
            .replace(/^\s*/g, '')
            .replace(/\s*$/g, '')
            // whitespace between elements
            .replace(/>\s*</g, '><')
            // whitespace between elements and mustaches
            .replace(/>\s*{{/g, '>{{')
            .replace(/}}\s*</g, '}}<')
            // whitespace between mustaches
            .replace(/}}\s*{{/g, '}}{{')
            // empty elements
            .replace(/<(\w+)([^\/>]*)\/>/g, '<$1$2></$1>');
    };

    var isTemplate = function(token) {
        return /^[^{]/.test(token);
    };

    var isPlain = function(token) {
        return /^{{\s*[a-zA-z0-9-_\.]+\s*}}$/.test(token);
    };

    var isRich = function(token) {
        return /^{{\s*&\s*[a-zA-z0-9-_\.]+\s*}}$/.test(token);
    };

    var isSection = function(token) {
        return /^{{\s*#/.test(token);
    };

    var isPartial = function(token) {
        return /^{{\s*>/.test(token);
    };

    var getname = function(mustache) {
        return mustache.match(/^{{\s*\W?\s*(.+?)\s*}}/)[1];
    };

    // stolen from http://stackoverflow.com/questions/11299284/javascript-deep-copying-object
    // and modified to support arrays
    var mixin = function(destination, source) {
        if (!destination) destination = {};
        for (var property in source) {
            if (Object.prototype.toString.call(source[property]) == '[object Array]') {
                destination[property] = destination[property] || [];
                mixin(destination[property], source[property]);
            } else if (typeof source[property] === "object" && source[property] !== null ) {
                destination[property] = destination[property] || {};
                mixin(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
        return destination;
    };

    var extractTemplate = function(tmpl, view) {
        if (view.indexOf(tmpl) == 0) return {};

        return;
    };

    var extractPlain = function(tmpl, hint, view) {
        var len, val;
        var result = {};
        if (!hint) {
            len = view.length;
        } else {
            len = view.indexOf(hint);
        }

        if (len == -1) return;

        val = view.slice(0, len);
        result[getname(tmpl)] = val;
        return result;
    };

    var extractRich = extractPlain;

    var extractSection = function(tmpl, hint, view, partials, result) {
        var model;
        var name = getname(tmpl);
        tmpl = tmpl.replace(/^{{#\w+}}|{{\/\w+}}$/g, '');
        if (tmpl.length == 0) return result;

        if (tokenize(tmpl).length == 1 && (isRich(tmpl) || isPlain(tmpl))) {
            model = [extract(tmpl, hint, view, partials)];
        } else {
            model = extractSectionHelper(tmpl, view, partials, []);
        }

        if (model.length == 1 && model[0][name]) return model[0];
        // TODO: clean this up, much nicer to return nothing...
        if (model.length == 0) model = '';

        var result = {};
        result[name] = model;
        return result;
    };

    var extractSectionHelper = function(tmpl, view, partials, result) {
        var model = getModel(tmpl, view, partials);
        var matchedView = mustache.render(tmpl, model, partials);
        if (view.indexOf(matchedView) != 0) return result;

        result.push(model);
        view = view.slice(matchedView.length);
        return extractSectionHelper(tmpl, view, partials, result);
    }

    var extractPartial = function(tmpl, view, partials) {
        var name = getname(tmpl);
        var model = getModel(partials[name], view, partials);
        return model;
    };

    var extract = function(tmpl, hint, view, partials) {
        if (isTemplate(tmpl)) {
            return extractTemplate(tmpl, view);
        } else if (isPlain(tmpl)) {
            return extractPlain(tmpl, hint, view);
        } else if (isRich(tmpl)) {
            return extractRich(tmpl, hint, view);
        } else if (isSection(tmpl)) {
            return extractSection(tmpl, hint, view, partials);
        } else if (isPartial(tmpl)) {
            return extractPartial(tmpl, view, partials);
        }
        throw 'extract error, unknown mustache';
    };

    var getModel = exports.getModel = function(tmpl, view, partials, hint) {
        var model, matchedView;
        var tokens = tokenize(tmpl);
        if (!tokens || tokens.length == 0) return;

        return tokens
            .reduce(function(result, token, index) {
                if (!result) return;

                hint = tokens[index+1];
                model = extract(token, hint, view, partials);
                matchedView = mustache.render(token, model, partials);
                if (view.indexOf(matchedView) != 0) return;

// if (model.type && model.name) console.log('matched', model.type, 'with name', model.name);
// if (model.itemType && model.itemName) console.log('matched bundleRight', model.itemType, 'with name', model.itemName);
// if (model.id && model.name && model.role) console.log('matched group', model.name);
                view = view.slice(matchedView.length);
                return mixin(result, model);
            }, {});
    };

    var verify = exports.verify = function(tmpl, view, partials) {
        var model = getModel(tmpl, view, partials);
        var newView = mustache.render(tmpl, model, partials);

        return view == newView;
    };

    if (!verify('', '')) throw 'error testing empty template';
    if (!verify('foo', 'foo')) throw 'error testing template text';
    if (verify('foo', 'bar')) throw 'error testing template text not matching';

    if (!verify('{{foo}}', 'foo')) throw 'error testing plaintext (no hint)';
    if (!verify('{{foo}}bar', 'foobar')) throw 'error testing plaintext';
    if (!verify('foo{{bar}}baz', 'foobarbaz')) throw 'error testing plaintext (prefixed)';

    if (!verify('foo{{{bar}}}baz', 'foobarbaz')) throw 'error testing richtext';
    if (!verify('foo{{&bar}}baz', 'foobarbaz')) throw 'error testing richtext (alt syntax)';

    if (!verify('foo{{#bar}}baz{{/bar}}qux', 'foobazqux')) throw 'error testing section template';
    if (!verify('foo{{#bar}}{{bar}}{{/bar}}baz', 'foobarbaz')) throw 'error testing if section plaintext';
    if (!verify('foo{{#bar}}{{bar}}{{/bar}}baz', 'foobaz')) throw 'error testing if section plaintext (empty)';
    if (!verify('foo{{#bar}}{{{bar}}}{{/bar}}baz', 'foobarbaz')) throw 'error testing if section richtext';
    if (!verify('foo{{#bar}}{{baz}}bar{{/bar}}qux', 'foo1bar2bar3barqux')) throw 'error testing multiple section';
    if (!verify('foo{{#bar}}baz{{#baz}}ooga{{blargh}}ooga{{/baz}}baz{{/bar}}qux', 'foobazoogablarghoogabazqux')) throw 'error testing nested section';

    if (!verify('foo{{>bar}}qux', 'foobarbazqux', {bar: '{{bar}}baz'})) throw 'error testing partial'
    if (!verify('foo{{#bar}}{{>baz}}{{/bar}}qux', 'foobar1bazbar2bazbar3bazqux', {baz: '{{bar}}baz'})) throw 'error testing section partial'
    if (!verify('foo{{#bar}}{{>baz}}{{/bar}}qux', 'foofooquxfooquxqux', {baz: 'foo{{#bar}}{{>baz}}{{/bar}}qux'})) throw 'error testing nested partial';

}(typeof exports === 'undefined' ? this.razor = {} : exports));
