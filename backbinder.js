"use strict";

//===={{ Underscore/Lo-dash extensions }}===========================================================

// Scoped so that functions using underscore can be added to it via _.mixin() 
// without polluting the namespace
(function () {
    /*
     * Similar to _.extend(), but without modifying the original object,
     * and more options to handle conflicts; defaults to _not_ overwriting attributes
     */
    var safeMerge = function (objectToGetAttributes, objectToMerge, options) {
        var mergedObject = _.clone(objectToGetAttributes);
        options = options || {};
     
        _.each(_.keys(objectToMerge), function (attribute) {
            if ( (!_.has(objectToGetAttributes, attribute) || options.overwrite === true)
                 &&   (options.exceptFor === undefined || !options.exceptFor(attribute))
                 &&   (options.onlyFor === undefined   || options.onlyFor(attribute)) ) {
                    
                mergedObject[attribute] = objectToMerge[attribute];
            }
        });
     
        return mergedObject;
    };
     
    /*
     * Imports external template file. Can use Require.js with Text plugin, or basic Ajax call
     */
    var getTemplate = function (pathToFile) {
        var templateText = undefined;
        if (require !== undefined) {
            require(["text!"+pathToFile], function (fileContents) {
                templateText = fileContents;
            });
        }
     
        else {
            $.get(_.templateSettings.directory + pathToFile, function (template) {
                templateText = $(template).html();
            });
        }
     
        return templateText;
    };
     
     
    _.mixin({
        safeMerge: safeMerge,
        getTemplate: getTemplate,
        startsWith: function (start, string) {
            return string.slice(0, start.length) === start;
        },
        endsWith: function (ending, string) {
            return string.slice(string.lastIndexOf(ending), string.length) === ending;
        }
    });
})();


//===={{ Backbone Enhancements }}===================================================================

//----{ Namespace }---------------------------------------------------------------------------------
Backbone.Namespace = function (namespaceOptions) {
    // Notated this way, because it might turn into a constructor function later on...
    var Namespace = function (options) {
    };

    Namespace.Model = {
        create: function (modelOptions) {
            modelOptions.namespace = Namespace;
            Namespace.Model = Backbone.EnhancedModel.extend(modelOptions);
        }
    };

    Namespace.View = {
        create: function (viewOptions) {
            viewOptions.namespace = Namespace;
            Namespace.View = Backbone.EnhancedView.extend(viewOptions);
        }
    };

    Namespace.Collections = _([]);

    Namespace.Collections.create = function (collectionOptions) {
        if (collectionOptions.model === undefined) {
            collectionOptions.model = this.Model;
        }

        var collection = Backbone.Collection.extend(collectionOptions);
        Namespace.Collections.push(collection);
        return collection;
    };

    // this small shortcut may or may not be a good idea...
    Namespace.all = function () { return this.Model.all; };

    return _.extend(Namespace, namespaceOptions);
};


//----{ Model }-------------------------------------------------------------------------------------
Backbone.EnhancedModel = Backbone.Model.extend();
Backbone.EnhancedModel.prototype.type = "EnhancedModel";

Backbone.EnhancedModel.extend = function (modelOptions, parentModel) {

    // TODO: all these modelOptions.____ functions should probably go in the defaults of the
    // Backbone.EnhancedModel definition, once the inheritence is working properly
    var initializeModel = modelOptions.initialize;

    modelOptions.initialize = function () {
        if (initializeModel !== undefined) {
            initializeModel.bind(this)();
        }

        this.constructor.collection.add(this);

        if ( parentModel !== undefined
        &&   parentModel.collection !== undefined
        &&   modelOptions.addToParentCollection !== false ) {

            parentModel.collection.add(this);
        }
    };

    modelOptions.setIf = function (property, newValue, condition) {
        if (condition instanceof Function) {
            condition = condition(this);
        }

        if (condition) {
            this.set(property, newValue);
        }
        return this;
    };

    modelOptions.setIfUndefined = function (property, newValue) {
        this.setIf(property, newValue, this.get(property) === undefined);
    };

    var model = Backbone.Model.extend(modelOptions);

    model.extend = function (childModelOptions) {
        // Ensure 'proper inheritance' by adding this model's attribures to its children
        childModelOptions = _.safeMerge(childModelOptions, modelOptions, {
            exceptFor: function (attribute) {
                return attribute === "initialize" && childModelOptions.initialize !== undefined;
            }
        });

        return Backbone.EnhancedModel.extend(childModelOptions, model);
    };

    if (parentModel === undefined) {
        parentModel = Backbone.EnhancedModel;
    }

    model.parent = parentModel;
    model.namespace = modelOptions.namespace;
    model.type = modelOptions.type;
    model.defaults = modelOptions.defaults;

    model.collection = new (Backbone.Collection.extend({
        model: model,
        excludingChildren: function () {
            var filteredInstances = [];

            if (arguments.length === 0) {
                filteredInstances = this.filter(function (modelInstance) {
                    return modelInstance.constructor.type === model.type;
                });
            }

            else {
                var childrenToExclude = _.map(arguments, function (childModel) {
                    if (childModel.type !== undefined && typeof childModel.type === "string")
                        return childModel.type;
                    else
                        return childModel;
                });

                filteredInstances = this.reject(function (modelInstance) {
                    return _.include(childrenToExclude, modelInstance.constructor.type);
                });
            }

            return new Backbone.Collection(filteredInstances);
        }
    }));
    model.all = model.collection;

    return model;
};


//----{ View }--------------------------------------------------------------------------------------
Backbone.EnhancedView = {
    cachedTemplates: {},
    cacheTemplate: function (templateSelector, template) {
        this.cachedTemplates[templateSelector] = template;
    },
    restoreTemplate: function (templateSelector) {
        return this.cachedTemplates[templateSelector];
    },
    templateStyles: {
        // TODO: Make this work somehow...
        handlebars: { regex: " /\{\{(.+?)\}\}/g" }
    },
    defaults: {
        instanceFilterKey: "name",
        elementTag: "div",
        viewAttribute: "data-view",
        modelAttribute: "data-model",
        bindToTemplate: true,
        templateSelector: "script[type='text/template']",
        removeTemplate: true,
        templateStyle: "default",
        templateDirectory: "/templates"
    }
};

_.templateSettings.directory = Backbone.EnhancedView.defaults.templateDirectory;

Backbone.EnhancedView.extend = function (viewOptions) {
    var defaults = Backbone.EnhancedView.defaults;

    if (viewOptions.model === undefined && viewOptions.namespace !== undefined) {
        viewOptions.model = viewOptions.namespace.Model;
    }

    var model = viewOptions.model;

    viewOptions.templateSelector = viewOptions.templateSelector || (defaults.templateSelector + "[data-view='"+ model.type +"']");
    viewOptions = _.safeMerge(viewOptions, defaults);

    viewOptions.el = viewOptions.elementTag + "["+ viewOptions.viewAttribute +"='" + model.type + "']";
    
    if (viewOptions.templateStyle !== "default") {
        _.templateSettings.interpolate = Backbone.EnhancedView.templateStyles[viewOptions.templateStyle];
    }

    if (viewOptions.templateDirectory !== defaults.templateDirectory) {
        _.templateSettings.directory = viewOptions.templateDirectory;
    }

    if (viewOptions.templateFile !== undefined) {
        viewOptions.template = _.getTemplate(viewOptions.templateFile);
    }

    var initializeView = viewOptions.initialize;
    viewOptions.initialize = function (element) {

        if (initializeView !== undefined) {
            initializeView.bind(this)();
        }

        this.setElement(element);

        if (viewOptions.instanceFilter !== undefined) {
                this.model = viewOptions.model.all.find(viewOptions.instanceFilter);
        }

        else {
            var modelType = this.$el.attr(viewOptions.modelAttribute);

            if (modelType === undefined) {
                modelType = this.$el.data(model.type);
            }

            if (modelType == undefined) {
                modelType = model.type;
                this.model = model;
            }

            else {
                this.model = viewOptions.model.all.find(function (modelInstance) {
                    return modelInstance.get(viewOptions.instanceFilterKey).toLowerCase() == modelType.toLowerCase();
                });
            }
        }

        this.render();
    };

    var renderView = viewOptions.render;
    viewOptions.render = function () {
        if (this.template === undefined && this.bindToTemplate === true) {
            var cachedTemplate = Backbone.EnhancedView.restoreTemplate(this.templateSelector);

            if (cachedTemplate !== undefined) { 
                this.template = cachedTemplate;
            }

            else {
                this.template = $(this.templateSelector).html();
                Backbone.EnhancedView.cacheTemplate(this.templateSelector, this.template);

                if (this.removeTemplate) {
                    $(this.templateSelector).remove();
                }
            }
        }

        if (this.template !== null) {
            this.render_template = _.template(this.template);
        }

        if (renderView !== undefined) {
            renderView.bind(this)();
        }

        return this;
    };


    var View = Backbone.View.extend(viewOptions);

    View.namespace = viewOptions.namespace;

    View.load = function () {
        if (arguments.length === 0) {
            $(viewOptions.el).each(function () {
                new View(this);
            });
        }
        else {
            _.each(arguments, function (element) {
                new View($(element));
            });
        }
    };

    return View;
};
