# Backbinder.js

A small [Backbone](http://backbonejs.org) extension framework that provides a collection of helper methods and binds components together 
to make for a leaner, more streamlined workflow when working with Backbone apps.


## Models
- Use `Backbone.EnhancedModel` to construct models
- Models now require a `type` property to be stated at definition time in order to take advantage of the
View Binding feature (described below); this property may simply be a string of the model's name

```javascript
var Person = Backbone.EnhancedModel.extend({
    type: "person",
});
```

- Model instances are automatically added to a `Backbone.Collection` accessible via `YourModel.collection`/`YourModel.all`.

```javascript
var larry = new Person({name: "Larry"});
var curly = new Person({name: "Curly"});
var moe = new Person({name: "Moe"});
Person.all // Backbone.Collection([larry, curly, moe])
```

- Parent model collections inherit the instances of their child models by default

```javascript
var Album = Backbone.EnhancedModel.extend();
var MetalAlbum = Album.extend({ type: "metal album", defaults: { genre: "metal" } });
var ExperimentalAlbum = Album.extend({ type: "experimental album",  defaults: ( genre: "experimental" ) });
var masterOfPuppets = new MetalAlbum({ artist: "metallica" });
var populationOverride = new ExperimentalAlbum({ artist: "buckethead" });
Album.all; // Backbone.Collection([masterOfPuppets, populationOverride])
Album.all.excludingChildren(); // Backbone.Collection([])
Album.all.excludingChildren(MetalAlbum) // Backbone.Collection([populationOverride])
```

- Models extended from other models now have referential access to their 'parent' model

```javascript
var Musician = Person.extend({type: "musician"});
Musician.parent // Person
Musician.parent.type // "person"
```

- Easy access to defaults post-initialization

```javascript
var Hippo = Backbone.EnhancedModel.extend({
    type: "hippo",
    defaults: {
        hungry: true
    }
});
var purple_hippo = new Hippo({color: "purple", hungry: false});
purple_hippo.defaults // {hungry: true}
```

- Conditional `set` methods

```javascript
var porridge = new Porridge();
porridge.setIf("good", true, function () {
    return !porridge.isTooCold() && !porridge.isTooHot();
});
porridge.setIfUndefined("eatenBy", "Goldilocks");
```

## View Binding
- Use `Backbone.EnhancedView` to construct views
- Only one View per Model type (`YourModel.type`)

```javascript
var Band = Backbone.EnhancedModel.extend({ type: "band" });
var BandView = Backbone.EnhancedView.extend({
    model: Band,
    render: function () { ... }
});
```

- Views come with a `load()` method, to automatically render your view/template to any valid html elements that refer
to your view:

```javascript
$(document).ready(function () {
    BandView.load();
});
```

renders your view to:

```html
<div data-view="band" data-model="metallica"></div>
```

- The `data-view` attribute corresponds to the type of model (`YourModel.type`) that your view is to display
- The `data-model` attribute corresponds to the model instance you want your view to display in that element
- `load()` supports any number of specific selectors for the view elements you wish to render

```javascript
$(function () {
    BandView.load("#megadeth", ".instrumental");
});
```

```html
<!-- Will be rendered -->
<div data-view="band" data-model="megadeth" id="megadeth"></div>
<div data-view="band" data-model="satriani" class="instrumental"></div>
<!-- Will not be rendered -->
<div data-view="band" data-model="coldplay"></div>
```

- Automatically binds template elements to their corresponding views

```javascript
var Album = Backbone.EnhancedModel.extend({ type: "album" });
var powerslave = new Album({
    artist: "Iron Maiden",
    title: "Powerslave",
    trackListing: [ ... ]
});
var AlbumView = Backbone.EnhancedView.extend({
    model: Album,
    instanceFilterKey: "title",
    render: function () {
        var html = this.render_template(this.model);
        this.$el.append(html);
    }
});
```

will render:

```html
<script type="text/template" data-view="album">
    <h1><%= get("title") %></h1>
    <ol>
        <% _.each(get("trackListing"), function (track) { %>
            <li><%= track %></li>
        <% }); %>
    </ol>
</script>
```

to here:

```html
<div data-view="album" data-model="powerslave"></div>
```

### Options
Options when defining a new view:  
- **instanceFilterKey** - The name of the model property that you wish to bind to the `data-model` attribute in your html  
  _default:_ "name"  
- **elementTag** - What element tag will be used to call the view  
  _default:_ "div"  
- **viewAttribute** - The html attribute that will specify which view to bind to  
  _default:_ "data-view"  
- **modelAttribute** - The html attribute that will specify which model instance to pass to the view  
  _default:_ "data-model"  
- **bindToTemplate** - Whether or not to automatically look for and bind to a template element  
  _default:_ true  
- **templateSelector** - Selector for the html element containing your view's template markup  
  _default:_ "script[type='text/template']\[data-view='_{{ YourModel.type }}_']"  
- **removeTemplate** - Whether or not to remove your original template markup from the DOM
  _default:_ true  


## Namespaces
- Provide a simple organized interface to manage models and their views
- Namespaces instantiate with `Model` and `View` properties that can intelligently leverage their relationship
- `Model` and `View` properties provide a simple `create()` method that's equivalent to defining them the traditional way

```javascript
var Book = Backbone.Namespace();
Book.Model.create({ type: "book" });
Book.View.create(
    // no need to define the 'model' property!
    render: function () { ... }
);
```

## Underscore Enhancements
- Compatible with [Lo-Dash](https://github.com/bestiejs/lodash)
- New string methods

```javascript
_.startsWith("cheese", "cheeseburger"); // true
_.endsWith("nut", "coconut"); // true
```

- Object merging with property selection, conflict resolution, and doesn't change the state 
of the original objects being merged

```javascript
var peanutButter = { style: "chunky", brand: "pb" };
var jelly = { flavor: "grape", brand: "jellytime" };
var pbAndJ = _.merge(peanutButter, jelly); // {style: "chunky", flavor: "grape", brand: "pb" };
pbAndJ == _.merge(peanutButter, jelly, {
    exceptFor: function (property) {
        return property === "brand";
    }
}); // {style: "chunky", flavor: "grape" };
```

## TODO
- Support importing external templates
- Ease integration with other templating languages


## License
This code is released under the Mozilla Public License.
