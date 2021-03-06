/*
 *  Copyright (C) 2008-2012 VMware, Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/*global dojo, wm */
dojo.provide("wm.base.Control");
dojo.provide("wm.base.Widget");
wm.splitUnits = function(inUnitValue) {
    if (!dojo.isString(inUnitValue)) return {value: inUnitValue, units: "px"};
    var m = (inUnitValue || "").match(wm.splitUnits.Rx);
    return { value: Number(m[1]) || 0, units: m[2] || "px" };
}
wm.splitUnits.Rx = /(\d*)(.*)/;

/**
   Manages geometry for a rectangle, including margins, borders, and padding and frame-of-reference calculations.
   @class
   @name wm.Bounds
*/
dojo.declare("wm.Bounds", null, {
    /** @lends wm.Bounds.prototype */
    padding: "",
    border: "",
    margin: "",
    constructor: function() {
	this.bounds = {l:0, t:0, w:96, h:64};
	this.borderExtents = {l:0, t:0, r:0, b: 0};
	this.paddingExtents = {l:0, t:0, r:0, b: 0};
	this.marginExtents = {l:0, t:0, r:0, b: 0, w: 0, h:0};
	this.padBorderMargin = {};
	this.calcPadBorderMargin();
    },
    getBounds: function() {
	return this.bounds;
    },
    /**
       Set the outermost area of this box, including margin, border, and padding.
       l, t describe the position of the outer most corner of this box.
       w, h describe the size of the box, including margin, border, and padding.
       @param {Object} inBox {l: Number, t: Number, w: Number, h: Number }
    */
    setBounds: function(inL, inT, inW, inH) {
	if (arguments.length == 1) {
	    return this.setBounds(inL.l, inL.t, inL.w, inL.h)
	}

	var b = this.bounds;
	if (!isNaN(inL) && b.l != inL) {
	    b.l = inL;
	}
	if (!isNaN(inT) && b.t != inT) {
	    b.t = inT;
	}
	if (inW >= 0 && b.w != inW) {
	    b.w = inW;
	    this._boundsDirty = true;
	}
	if (inH >= 0 && b.h != inH) {
	    b.h = inH;
	    this._boundsDirty = true;
	}

	// If b.l, b.w, b.t or b.h is a string like "100", it should be changed to integer before adding.
	// To ensure that we multiple it by 1.
	b.r = b.l*1 + b.w*1;
	b.b = b.t*1 + b.h*1;
	return b;
    },
    setContentBounds: function(inBox) {
	var b= {};
	var sm = this.getScrollMargins();
	if ("w" in inBox) {
	    b.w = inBox.w + this.padBorderMargin.w + sm.w;
	}
	if ("h" in inBox) {
	    b.h = inBox.h + this.padBorderMargin.h + sm.h;
	}
	return this.setBounds(b);
    },
    _parseExtents: function(inExtents) {
	inExtents = String(inExtents);
	var r = {};
	if (typeof inExtents == "number")
	    r = { l: inExtents, t: inExtents, r: inExtents, b: inExtents };
	else {
	    var ex = inExtents.split(",");
	    var l = ex.length;
	    r.t = parseFloat(ex[0]) || 0;
	    r.r = l < 2 ? r.t : parseFloat(ex[1]) || 0;
	    r.b = l < 3 ? r.t : parseFloat(ex[2]) || 0;
	    r.l = l < 4 ? r.r : parseFloat(ex[3]) || 0;
	}
	return r;
    },
    _stringifyExtents: function(inExtents) {
        return inExtents.t + "," + inExtents.r + "," + inExtents.b + "," + inExtents.l;
    },
    /**
       Set padding extents in pixels.
       @param {String||Number} inPadding "t, <r, b, l>" || Number
    */
    setPadding: function(inPadding) {
	this.padding = String(inPadding);
	this.paddingExtents = this._parseExtents(this.padding);
	this.padBorderMarginChanged();
	this.invalidCss = true;
	this.render();
    },
    /**
       Set border extents in pixels.
       @param {String||Number} inBorder "t, <r, b, l>" || Number
    */
    setBorder: function(inBorder) {
	inBorder = String(inBorder);
	inBorder = (inBorder && inBorder.match(/\d/)) ? inBorder : "0";
	if (inBorder !== this.border) {
	    this.border = inBorder;
	    this.borderExtents = this._parseExtents(inBorder);
	    this.padBorderMarginChanged();
	    this.invalidCss = true;
	    this.render();
	}
    },
    /**
       Set margin extents in pixels.
       @param {String||Number} inMargin "t, <r, b, l>" || Number
    */
    setMargin: function(inMargin) {
	this.margin = String(inMargin);
	var me = this.marginExtents = this._parseExtents(this.margin);
	me.h = me.t + me.b;
	me.w = me.l + me.r;
	this.padBorderMarginChanged();
	this.invalidCss = true;
	this.render();
    },
    setOneMargin: function(inMargin,edge) {
        var m = this.marginExtents;
        m[edge] = inMargin;
        this.setMargin(this._stringifyExtents(m));
    },
    /**
       Update metrics when padBorderMargin has changed.
       @protected
    */
    padBorderMarginChanged: function() {
	this.calcPadBorderMargin();
    },
    /**
       Accumulate padBorderMargin extents.
       @private
    */
    _edges: {l:1, t:1, r:1, b:1},
    calcPadBorderMargin: function() {
	var pbm = this.padBorderMargin;
	for(var e in this._edges)
	    pbm[e] = this.borderExtents[e] + this.paddingExtents[e] + this.marginExtents[e];
	pbm.w = pbm.l + pbm.r;
	pbm.h = pbm.t + pbm.b;
    },
    getScrollMargins: function() {
	return {w:0, h:0};
    },
    /**
       Get an object describing the content-box area.
       l, t describe the position of the origin for objects in this frame.
       w, h describe the size of the content area of the box (inside margin, border, padding, and scrollbars).
       @return {Object} {l: Number, t: Number, w: Number, h: Number}
    */
    getContentBounds: function() {
	var sm = this.getScrollMargins();

	    var b = {
		l: this.paddingExtents.l,
		t: this.paddingExtents.t,
		w: Math.floor(this.bounds.w) - this.padBorderMargin.w - sm.w,
		h: Math.floor(this.bounds.h) - this.padBorderMargin.h - sm.h
	    };

 	if (b.w < 0) b.w = 0;
 	if (b.h < 0) b.h = 0;
	b.r = b.l + b.w;
	b.b = b.t + b.h;
	return b;
    },
    getStyleBounds: function() {
	if (this.isRelativePositioned){
	    return {w: this.width, h: this.height};
	}

	var pbm = (this.dom.node.tagName.toLowerCase() == "button") ? this.marginExtents : this.padBorderMargin;
	    var b = {
		l: this.bounds.l,
		t: this.bounds.t,
		w: this.bounds.w - pbm.w,
		h: this.bounds.h - pbm.h
	    };

 	if (b.w < 0) b.w = 0;
 	if (b.h < 0) b.h = 0;
	b.r = b.l + b.w;
	b.b = b.t + b.h;
	return b;
    },
    cloneBounds: function() {
	with (this.bounds) {
	    return {l:l, t:t, w:w, h:h, r:r, b:b};
	}
    }
});

dojo.declare("wm.DomNode", null, {
    constructor: function(inNode, isRelativePositioned) {
	this.node = inNode || document.createElement('div');
	this.isRelativePositioned = isRelativePositioned;
    },
    append: function(inDomNode) {
	this.node.appendChild(inDomNode.node);
    },
    remove: function(inDomNode) {
	this.node.removeChild(inDomNode.node);
    },
    getWidth: function() {
	return this.node.offsetWidth;
    },
    getHeight: function() {
	return this.node.offsetHeight;
    },
    setBox: function(inBox, inSingleLine) {
	var isChanged = false;
	var s = this.node.style;
	//		var style = {};
	if (this.isRelativePositioned){
	    s.width = inBox.w;
	    s.height = inBox.h;
	    return true;
	}

	var bl = inBox.l + "px";
	if (!isNaN(inBox.l) && s.left != bl) {
	    s.left = bl;
	    isChanged = true;
	}
	var bt = inBox.t + "px";
	if (!isNaN(inBox.t) && s.top != bt) {
	    s.top = bt;
	    isChanged = true;
	}
	var bw = inBox.w + "px";
	if (inBox.w >=0 && s.width != bw) {
	    s.width = bw;
	    isChanged = true;
	}
	var bh = inBox.h + "px";
	if (inBox.h >= 0) {
	    //if (s.height != bh)
	    s.height = bh;
	    s.lineHeight = inSingleLine ? bh : "normal";
	    isChanged = true;
	}

	//dojo.style(this.node, style);  proven to be very slow
	return isChanged;
    },
    setCssText: function(inText) {
	this.node.style.cssText += ";" + inText;
    },
    addCssText: function(inText) {
	this.node.style.cssText += inText;
    }
});

/* Appears to be obsolete
   wm.aligns = [
   "topLeft", "center", "bottomRight", "justified"
   ];*/

/**
   Base class for all <i>visual</i> components.
   @name wm.Control
   @class
   @extends wm.Component
*/
wm.define("wm.Control", [wm.Component, wm.Bounds], {
    /** @lends wm.Control.prototype */
    /*
      published: {
      invalidCss: {ignore: 1},
      renderedOnce: {ignore: 1},
      bounds: {ignore: 1},
      border: {group: "style", doc: 1},
      borderColor: {group: "style", doc: 1},
      //backgroundColor: {group: "style"},
      backgroundColor: {ignore: 1},
      margin: {group: "style", doc: 1},
      padding: {group: "style", doc: 1},
      autoScroll: {group: "scrolling", order: 100, ignore: 1, writeonly: 1},
      scrollX: {group: "scrolling", order: 101, ignore: 1, writeonly: 1},
      scrollY: {group: "scrolling", order: 102, ignore: 1, writeonly: 1},
      left: {writeonly: 1, ignore: 1},
      top: {writeonly: 1, ignore: 1}
      },
    */
    mobileFolding: false,
    mobileFoldingIndex: "",
    mobileFoldingCaption: "",

    imageList: "",
    imageIndex: -1,
    renderedOnce: 0,
    invalidCss: 1,
    autoScroll: false,
    backgroundColor: "",
    //border: 1,
    borderColor: "#F0F0F0",
    //binding: '(data binding)',
    classNames: '',
    id: '',
    autoSizeWidth: false,
    autoSizeHeight: false,
    _needsAutoSize: true,
    /*
      flex: '',
      left: '',
      top: '',
    */
    /**
       Display width specified as a string with units.<br>
       <br>
       Supports CSS units and <i>flex</i> units.<br>
       @example
       this.button.setValue("width", "96px");
       this.text.setValue("width", "4em");
       this.box.setValue("width", "1flex");
       @type String
    */
    width: '',
    /**
       Display height specified as a string with units.<br>
       <br>
       Supports CSS units and <i>flex</i> units.<br>
       @example
       this.button.setValue("height", "96px");
       this.text.setValue("height", "4em");
       this.box.setValue("height", "1flex");
       @type String
    */
    height: '',
    minHeight: 0, // number represents pixels
    minWidth: 0,
    minMobileHeight: 0,
    minDesktopHeight: 0,
    enableTouchHeight: false,
    //maxHeight: 0, // number represents pixels
    //maxWidth: 0,

    styles: '',
    /**
       Showing state.<br>
       <br>
       Whether the widget if shown on the display.<br>
       @see <a href="#hide">hide</a>, <a href="#show">show</a>.
       @example
       this.button.setValue("showing", false);
       this.panel.show();
       this.label.hide();
       @type Boolean
    */
    showing: true,
    /**
       Disabled state.<br>
       <br>
       Some widgets change behavior or display based on the disabled state.<br>
       @see <a href="#disable">disable</a>, <a href="#enable">enable</a>.
       @example
       this.button.setValue("disabled", true);
       this.panel.disable();
       this.label.enable();
       @type Boolean
    */
    disabled: false,
    _parentDisabled: false,
    _disabled: false, // combines disabled and _parentDisabled
    container: false,
    _classes: {domNode:[]}, // prototype gets a blank object for us to clone; allows theme to provide default classes
    scrollX: false,
    scrollY: false,

    //===========================================================================
    // Construction
    //===========================================================================
    constructor: function() {
    	this.widgets = {};
    	this._classes = dojo.clone(this._classes);
    },


    // experimental code for supporting dojo.parser
    // TODO:
    // 1. Need a way to find the parent widget (owner[node.parentNode.id]) should work, though we may need to parse "id" to strip out any owner ids
    // 2. Need a way to find the owner component (Page.js will need to set a global app._currentParseOwner before calling dojo.parser; and then restoring the prior value when its done in case Page.js is loading a pagecontainer)
    // 3. Need a way to invoke postInit; probably will need Page.js to do a second traversal after all widgets are created calling postInit on each widget
    markupFactory: function(params, node) {
        var ctor = arguments.callee.arguments[2];
        var domNode = node;
        var owner = wm._dojoParserCurrentOwner;
        var parentid = node.parentNode.id;
        while (parentid.indexOf("_") != -1 && !owner[parentid])
        parentid = parentid.substring(parentid.indexOf("_") + 1);
        var parent = owner[parentid];
        params = dojo.mixin(params, {
            domNode: domNode,
            parentNode: domNode.parentNode,
            parent: parent,
            name: owner.getUniqueName(params.name),
            owner: owner,
            _designer: owner._designer,
            _loading: false
        }); // should be changing this to true... but need to do something about calling postInit in a second pass before we change this
        var result = new ctor(params);
        if (!params.parent && ctor.prototype.declaredClass == "wm.Layout") result.owner.root = result;
        return result;
    },
    prepare: function(inProps) {
        try {
            if (inProps) {
                var owner = inProps.owner;
                if (!owner && parent) {
                    owner = inProps.owner = parent.owner;
                }
                if (owner) owner = owner.getOwnerApp();
                if (owner) owner.loadThemePrototypeForClass(this.constructor, this);
            }
        } catch (e) {
            console.error("What the hell?" + e);
        }
        this.inherited(arguments);
    },
    postscript: function(inProps) {
        this.inherited(arguments);
    },
    create: function() {
        this._cupdating = true;
        this.inherited(arguments);
    },
    build: function() {
        this.domNode = dojo.byId(this.domNode || /*this.id||*/ undefined);
        if (!this.domNode) this.domNode = document.createElement('div');
    },
    initDomNode: function() {
        if (!this.dom) {
            this.dom = new wm.DomNode(this.domNode, this.isRelativePositioned);
            if (!this.isRelativePositioned) this.domNode.style.position = "absolute";
            else this.domNode.style.position = "relative";
            this.setParent(this.parent);
            this.setDomNode(this.domNode);
        }
    },
    init: function() {

        this.initDomNode();
        this.inherited(arguments);

        var isMobile = wm.isMobile || this._isDesignLoaded && studio.currentDeviceType != "desktop";
        if (this.height && String(this.height).match(/\%/)) {
            this.mobileHeight = this.desktopHeight = this.height;
        } else if (!isMobile || !this.enableTouchHeight) {
            if (this.desktopHeight != null) {
                this.height = this.desktopHeight;
            } else if (this.height) {
                this.desktopHeight = this.height;
            } else {
                this.height = this.desktopHeight = this.constructor.prototype.height;
            }
            if (this.minDesktopHeight) {
                this.minHeight = this.minDesktopHeight;
            } else if (this.minHeight) {
                this.minDesktopHeight = this.minHeight;
            } else {
                this.minHeight = this.minDesktopHeight = this.constructor.prototype.minHeight;
            }

        } else {
            if (this._isDesignLoaded && studio.currentDeviceType == "desktop" || this.desktopHeight == undefined) {
                this.desktopHeight = this.height || this.mobileHeight;
            }
            if (this.desktopHeight && typeof this.desktopHeight == "string" && this.desktopHeight.match(/\%/)) {
                this.height = this.mobileHeight = this.desktopHeight;
            } else if (this.mobileHeight) {
                this.height = this.mobileHeight;
            } else if (this.height) {
                this.mobileHeight = this.height;
            } else {
                this.height = this.mobileHeight = this.constructor.prototype.height;
            }
            if (this.minMobileHeight) {
                this.minHeight = this.minMobileHeight;
            } else {
                this.minHeight = this.minMobileHeight = this.constructor.prototype.minHeight;
            }
        }

        //if (() && (!this.owner || this.owner.enableTouchHeight) && this.mobileHeight != undefined && !this.height.match(/\%/) && parseInt(this.mobileHeight) > parseInt(this.height)) this.height = this.mobileHeight;
        this.bc(); // mostly in here to support wm.Container's bc method
        //
        /*
      this.setBorder(this.border);
      this.setMargin(this.margin);
      this.setPadding(this.padding);
    */
        if (this.isDesignLoaded())
        // enable design borders
        this.set_border((this.border) ? String(this.border) : "0");
        else {
            this.border = (this.border) ? String(this.border) : "0";
        }
        this.borderExtents = this._parseExtents(this.border);

        this.padding = String(this.padding);
        this.paddingExtents = this._parseExtents(this.padding);
        this.setMargin(String(this.margin));
        this.doSetSizeBc();
        if (!this.showing) this.setShowing(false, true);

        this.setDisabled(this.disabled);

        /* This code is only used in design mode... if then
    if (this.styles) {
        this.set_styles(this.styles);
        this.styles = "";
    }
*/
        this.appendDOMNode(this.parent);
        this.updateBounds();
    },

    bc: function() {
	// oboslete method; but the version in wm.Container is still required for framework to function
    },

    postInit: function() {
        this._cupdating = false;
        this.inherited(arguments);

        // After we've finished creating the widget, NOW we render() -- just once; not over and over while we're setting borders and
        // margins and everything else.
        this.render(1);


        if (this.addTouchListener && wm.isMobile && !window["studio"]) {
            //this.connect(this._touchNode || this.domNode, wm.isFakeMobile ? "mousedown" : "touchstart", this, "_onTouchStart");
            this.addTouchListener(this._touchNode || this.domNode);
        }

        if (!this.$.binding && this.isDesignLoaded()) new wm.Binding({
            name: "binding",
            owner: this
        });
        if (this.hint) {
            this.setHint(this.hint);
        }
    },


    destroy: function() {
        if (this.isDestroyed || this._isDestroying) return;
        this._isDestroying = true;

        try {
            if (app.toolTipDialog && this == app.toolTipDialog.tipOwner) {
                app.toolTipDialog.hide();
            }

            if (this._layerConnections) delete this._layerConnections;

            if (this.widgets) {
                var wids = [];
                wm.forEachProperty(this.widgets, function(w, name) {
                    wids.push(w);
                });
                for (var i = 0, w;
                (w = wids[i]); i++)
                w.destroy();
                wids = [];
            }

            this.widgets = null;
            this.parentNode = null
            this.setParent(null);
            wm.fire(this.designWrapper, "destroy");
            this.layout = null;
            this.inherited(arguments);
        } catch (e) {
            console.info('Error while destroying : ' + this.name, e);
        } finally {
            if (this.domNode) dojo.destroy(this.domNode);
            this.domNode = null;
            this._designee = null;
            if (this.dom && this.dom.node) {
                dojo.destroy(this.dom.node);
                this.dom.node = null;
                this.dom = null;
            }

        }
    },
    loaded: function() {
        this.inherited(arguments);
        this.initUserClasses();
    },
    setDomNode: function(inDomNode) {
        var n = this.domNode = inDomNode;
        if (dojo.isIE <= 8) {
            // forcing a size on the node now seems to help IE
            // honor auto sizing later
            n.style.width = "0px";
        }
        // id
        this.updateId();
        // classes
        var cNames = this.classNames + (this.owner ? ' ' + this.owner.declaredClass.replace(/\./g, "") + '-' + this.name : '') + (this.isRelativePositioned && this.parent && this.parent.layoutKind == 'left-to-right' ? ' wmInlineDiv' : '');
        dojo.addClass(n, cNames);
        this.initUserClasses();
        //this.updateBounds();
    },


    isAncestorHiddenLayer: function() {
        if (this instanceof wm.Layout && this.owner == app._page) return false;
        if (this instanceof wm.Layer && this.parent instanceof wm.Layers && this.parent.getActiveLayer() != this) return true;
        var parent;
        if (this.parent && this.parent instanceof wm.Control) parent = this.parent;
        else if (this.owner instanceof wm.Page && this.owner.owner instanceof wm.Control) parent = this.owner.owner;
        if (!parent) return false;
        return parent.isAncestorHiddenLayer();
    },
    isAncestorHidden: function() {
        if (!this.showing && this instanceof wm.Layer == false) return true;
        if (this instanceof wm.Layout && this.owner == app._page || this instanceof wm.Dialog) return false;
        if (this instanceof wm.Layer && !this.active) return true;
        var parent;
        if (this.parent && this.parent instanceof wm.Control) parent = this.parent;
        else if (this.owner instanceof wm.Page && this.owner.owner instanceof wm.Control) parent = this.owner.owner;
        if (!parent) return false;
        return parent.isAncestorHidden();
    },

    callOnShowParent: function() {
        var self = this;
        wm.forEachVisibleWidget(this, function(w) {
            if (self != w) { /* For internal widget detection of changes to showing state, use _onShowParent */
                if (w._onShowParent) {
                    w._onShowParent();
                }

                /* For public tooled detection use onShow; only call onShow if its been replaced with something other than
                 * the default empty onShow event handler because we can't be making 1000s of empty onShow calls
                 */
                if (w.onShow && w.onShow != w.constructor.prototype.onShow) {
                    w.onShow();
                }

            }
        }, true);
    },
    callOnHideParent: function() {
        var self = this;
        if (!this.isDestroyed) {
            wm.forEachVisibleWidget(this, function(w) {
                if (w.hint && app.toolTipDialog && app.toolTipDialog.tipOwner == self) app.hideToolTip();
                if (self != w) { /* For internal widget detection of changes to hideing state, use _onHideParent */
                    if (w._onHideParent) {
                        w._onHideParent();
                    }

                    /* For public tooled detection use onHide; only call onHide if its been replaced with something other than
                     * the default empty onHide event handler because we can't be making 1000s of empty onHide calls
                     */
                    if (w.onHide && w.onHide != w.constructor.prototype.onHide) {
                        w.onHide();
                    }


                }
            }, true);
        }
    },
    onShow: function(){},
    onHide: function(){},


    // OPTIONAL: Maybe handle all parents showing/hiding but thats a lot of connections
    //           and it may be better to just tell people not to show/hide parents of widgets needing these; just use layers
    // NOTE: Also handles dialogs if "this" is in a dialog; these connections to layers are more about knowing when its hidden/showing
    // and less about the details of whether its a layer or something else.
    connectToAllLayers: function(obj, callback) {
        var layers = [];
        var dialogs = []; // should only be 0 or 1 dialogs, but arrays work nicely no matter how many elements
        var parentObj = this;
        while (parentObj && (!app._page || parentObj != app._page.root)) {
            if (parentObj instanceof wm.Layer) layers.push(parentObj);
            else if (parentObj instanceof wm.Dialog) dialogs.push(parentObj);
            if (parentObj.parent) parentObj = parentObj.parent;
            else if (parentObj.owner instanceof wm.Page && parentObj.owner.owner instanceof wm.Control) parentObj = parentObj.owner.owner;
            else parentObj = null;
        }

        var f = dojo.hitch(obj, callback);
        this._layerConnections = [];
        dojo.forEach(layers, dojo.hitch(this, function(l) {
            this._layerConnections.push(this.connect(l, "onShow", this, function() {
                if (dojo.every(layers, function(l2) {
                    return l2.isActive();
                }) && dojo.every(dialogs, function(l2) {
                    return l2.showing;
                })) {
                    f();
                }
            }));
        }));

        dojo.forEach(dialogs, dojo.hitch(this, function(d) {
            this._layerConnections.push(this.connect(d, "setShowing", this, function() {
                if (d.showing && !d._transitionToHiding) { // transition handles case where showing is true, but animation is running that will have it hidden very soon
                    if (dojo.every(layers, function(l2) {
                        return l2.isActive();
                    }) && dojo.every(dialogs, function(l2) {
                        return l2.showing;
                    })) {
                        f();
                    }
                }
            }));
        }));

    },
    disconnectFromAllLayers: function() {
        dojo.forEach(this._layerConnections, dojo.hitch(this, function(c) {
            dojo.disconnect(c);
            this._connections = wm.Array.removeElement(this._connections, c);
        }));
        delete this._layerConnections;
    },
    isAncestor: function(inParent) {
        var o = this.parent;
        while (o && o != inParent) {
            o = o.parent;
        }
        return (o == inParent);
    },

    //===========================================================================
    // Name & Id
    //===========================================================================
    updateId: function() {
        this.inherited(arguments);
        if (this.domNode) {
            var rid = this.getRuntimeId();
            this.domNode.rid = rid;
            this.domNode.id = rid.replace(/\./g, "_");
        }
    },
    //===========================================================================
    // Ownership
    //===========================================================================
    getUniqueName: function(inName) {
        return wm.findUniqueName(inName, [this, this.components, this.widgets]);
    },
    //===========================================================================
    // Parentage
    //===========================================================================
    setName: function(inName) {
        if (!inName) return;
        if (this.parent) this.parent.removeWidget(this);
        this.addRemoveDefaultCssClass(false);
        this.inherited(arguments);
        if (this.parent) this.parent.addWidget(this);
        this.addRemoveDefaultCssClass(true);
    },
    addWidget: function(inWidget) {
        this.widgets[inWidget.name] = inWidget;
        var p = this.containerNode || this.domNode;
        if (inWidget.domNode.parentNode != p) {
            p.appendChild(inWidget.domNode);
        }
    },
    /* NOTE: I don't see this called anywhere */
    insertDomNodes: function() {
        wm.forEachProperty(this.widgets, function(w, name) {
            w.insertDomNodes();
        });

        var parentPage = this.getParentPage();
        try {
            var a = 1;
            if ((!parentPage || parentPage._disableRendering) && this.invalidCss) {
                this.renderCss();
                this.invalidCss = false;
            }

            var p = this.containerNode || this.parentNode || this.parent.domNode;
            if (this.domNode.parentNode != p && this.domNode.parentNode != window.document.body) {
                p.appendChild(this.domNode);
            }
        } catch (e) {
            console.log("ERROR INSERTING DOM NODES FOR " + this.name);
        }
        //  }
    },
    leafFirstRenderCss: function() {
        wm.forEachProperty(this.widgets, function(w, name) {
            w.leafFirstRenderCss();
        });
        if (this.invalidCss) {
            this.render(1);
        }
    },
    removeWidget: function(inWidget) {
        if (this.widgets) delete this.widgets[inWidget.name];
    },
    adjustChildProps: function(inCtor, inProps) {
        if (wm.isClassInstanceType(inCtor, wm.Control))
        // assignChildrenToOwner allows a widget to be owned by a container, the container is owned by the page, and that widget's children are also owned by the page
        dojo.mixin(inProps, {
            owner: this._assignChildrenToOwner || this.owner,
            parent: this
        });
        else this.inherited(arguments);
    },


    //===========================================================================
    // Bounds
    //===========================================================================
    // BC -->
    doSetSizeBc: function() {
        /*if (!this.width) {
      this.setSizeProp("width", "100%");
      }
      if (!this.height) {
      this.setSizeProp("height", "100%");
      }*/
        if (this.sizeUnits == "flex") {
            this.setFlex(this.size);
        } else if (this.sizeUnits) {
            var b = this.getParentBox(),
                p = {
                    v: "height",
                    h: "width"
                }[b];
            this.setSizeProp(p, this.size + this.sizeUnits);
        } else if (this.flex) {
            this.setFlex(this.flex);
        }
    },
    setFlex: function(inFlex) {
        var box = this.getParentBox();
        if (box) {
            var ex = {
                h: "width",
                v: "height"
            }[box];
            this.setSizeProp(ex, inFlex * 100 + "%");
            this._boundsDirty = true;
        } else {
            this.setSizeProp("width", inFlex * 100 + "%");
            this.setSizeProp("height", inFlex * 100 + "%");
        }
    },
    /* mkantor: Commented out 4/14/2010; presumed WM 4.x only
       isFlex: function() {
       var box = this.getParentBox();
       if (!box)
       return false;
       var ex = {h: "width", v: "height"}[box];
       return (this[ex].indexOf("flex")>=0);
       },
    */
    // <-- BC
    getScrollMargins: function() {
        if (wm.isMobile) {
            return {
                w: (this.scrollY || this._xscrollY) ? 2 : 0,
                h: (this.scrollX || this._xscrollX) ? 2 : 0
            };
        } else {
            return {
                w: (this.scrollY || this._xscrollY) ? 17 : 0,
                h: (this.scrollX || this._xscrollX) ? 17 : 0
            };
        }
        /*
      if (!this.autoScroll) {
      return {w: (this.scrollY) ? 17 : 0, h: (this.scrollX) ? 17 : 0};
      } else {
      return {w: (this._xscrollY || this.domNode.style.overflow == "auto") ? 17 : 0, h: (this._xscrollX || this.domNode.style.overflow == "auto") ? 17 : 0};
      }
    */
    },
    isReflowEnabled: function() {
        if (this._cupdating) return false;
        if (this.owner) {
            if (wm.isInstanceType(this.owner, wm.Control)) return this.owner.isReflowEnabled();
            else {
                return !this.owner._loadingPage;
            }
        }
        return true;
    },
    padBorderMarginChanged: function() {
        this.inherited(arguments);

        if (!this._doingAutoSize) this._needsAutoSize = true;

        if (this.isReflowEnabled()) {
            if (this.parent) this.parent.reflow();
            else {
                this.render();
                wm.fire(this, "flow");
            }
        }
    },
    /**
       Update width and height properties after bounds change.
    */
    boundsResized: function() {
        var box = dojo.marginBox(this.dom.node);
        if (this.bounds.w != box.w) {
            this.width = this.bounds.w + "px";
        }
        if (this.bounds.h != box.h) {
            this.height = this.bounds.h + "px";
        }
        this.updateBounds();
    },
    /**
       Update bounds and flex properties based on width/height properties
    */
    updateBounds: function() {
        //this.domNode.flex = 0;
        //this.fluidSize = 0;
        this._percEx = {
            w: 0,
            h: 0
        };
        //
        //var pd = this.getParentBox();
        //
        var su = wm.splitUnits(this.width);
        var w = su.value;
        switch (su.units) {
            // FIXME: 'flex' and 'em' are deprecated, probably this should be in BC block
        case "flex":
            w *= 100;
            this._percEx.w = w;
            this.width = w + "%";
            w = NaN;
            break;
        case "em":
            w *= 18;
            this.width = w + "px";
            break;
        case "%":
            this._percEx.w = w;
            w = NaN;
            break;
        }
        //
        su = wm.splitUnits(this.height);
        var h = su.value;
        switch (su.units) {
            // FIXME: 'flex' and 'em' are deprecated, probably this should be in BC block
        case "flex":
            h *= 100;
            this._percEx.h = h;
            this.height = h + "%";
            h = NaN;
            break;
        case "em":
            h *= h * 18;
            this.height = h + "px";
            break;
        case "%":
            this._percEx.h = h;
            h = NaN;
            break;
        }

        this.setBounds(NaN, NaN, w, h);
        //this.setBounds(this.left, this.top, w, h);
    },
    // return the 'box' setting of our parentNode
    getParentBox: function() {
        var n = (this.domNode || 0).parentNode;
        return n && (n.box || (n.getAttribute && n.getAttribute("box"))) || (this.parent || 0).box || '';
    },

    adjustSetSizeProp: function(n, v) {
        return v;
    },
    setSizeProp: function(n, v, inMinSize) {
        // We either have a minSize passed in from user set properties, or we let the widget itself decide what its minimum size should be.
        var minName = "min" + wm.capitalize(n);
        var getMin = "getMin" + wm.capitalize(n) + "Prop";
        var minSize = !wm.isMobile && inMinSize || this[getMin]();

        v = this.adjustSetSizeProp(n, v);

        if (this[n] == v && this[minName] == inMinSize) {
            if (v.match(/px/) && parseInt(v) != this.bounds[(n == "height") ? "h" : "w"]) {;
            } else {
                return;
            }
        }

        this[n] = v;
        this[minName] = inMinSize;

        // If widget suppports resizing, and isn't in the middle of doing an autoSize, then it now needs to be autoResized as its width or height have changed
        if (!this._doingAutoSize) {
            this._needsAutoSize = true;

            // A setSize call that is not made while doing autoSize means we are no longer an autosize widget
            if (this.autoSizeHeight && n == "height") this.autoSizeHeight = false;
            if (this.autoSizeWidth && n == "width") this.autoSizeWidth = false;
        }

        // MK: One line fix added Feb 18 2010:
        // Because the domNode of the designWrapper is not getting updated, we need to set invalidCss to true.  May prove unnecessary.
        if (this.designWrapper) this.designWrapper.invalidCss = true;

        if (!this._loading) this.updateBounds();
        if (this.isReflowEnabled() && this.showing) {
            this.reflowParent();
            if (this._isDesignLoaded && this.parent instanceof wm.Container) {
                var parent = this.parent
                wm.job(parent.getRuntimeId() + ".designResize", 50, function() {
                    parent.designResizeForNewChild();
                });
            }
        }
    },
    setWidth: function(inWidth) {
        this.setSizeProp("width", inWidth, this.minWidth);
    },
    setHeight: function(inHeight) {
        this.setSizeProp("height", inHeight, this.minHeight);
    },
    setMinWidth: function(inMinWidth) {
        inMinWidth = (inMinWidth) ? parseInt(inMinWidth) : 0;
        /*
    if (inMinWidth > this.bounds.w) {
        this.width = inMinWidth + "px";
    }
    */
        this.setSizeProp("width", this.width, inMinWidth);
    },
    setMinHeight: function(inMinHeight) {
        inMinHeight = (inMinHeight) ? parseInt(inMinHeight) : 0;
        /*
    if (inMinHeight > this.bounds.h) {
        this.height = inMinHeight + "px";
    }
    */
        this.setSizeProp("height", this.height, inMinHeight);
    },

    // this method is related to set/getMinWidth/Height, but whereas set/getMinWidth/Height are basic setters/getters of the minWidth/minHeight property,
    // these methods are designed to allow each object to calculate at runtime what its preferred minimum is... unless one has been specified by the user.
    // NOTE: minWidth/minHeight are ignored if size is set in px instead of %.  minHeight/minWidth may also kick in for fitToContent containers.
    getMinWidthProp: function() {
        return parseInt(this.minWidth) || 30;
    },
    getMinHeightProp: function() {
        return parseInt(this.minHeight) || 15;
    },
    /*
      setMaxWidth: function(inMaxWidth) {
      inMaxWidth = parseInt(inMaxWidth) || 0;
      this.setSizeProp("width", this.width, this.minWidth, inMaxWidth);
      },
    */
    setMaxHeight: function(inMaxHeight) {
        inMaxHeight = parseInt(inMaxHeight) || 0;
        this.maxHeight = inMaxHeight;
        if (inMaxHeight > this.bounds.h) this.reflowParent();
    },


    getDomHeight: function() {
        return dojo.coords(this.domNode, false).h;
    },

    // Returns integer value in pixels
    getDomWidth: function() {
        return dojo.coords(this.domNode, false).w;
    },

    /* This should work, but risks the UI being rather jumpy, so best to provide custom method for each widget where possible */
    doAutoSize: function(setSize, force) {
        if (this._doingAutoSize || !this.autoSizeHeight && !this.autoSizeWidth) return;
        if (!force && !this._needsAutoSize) return;

        if (this.isAncestorHidden()) {
            return;
        }


        this._doingAutoSize = true;
        this._needsAutoSize = false;

        if (this.autoSizeWidth) {
            this.domNode.style.width = "";
            var neww = dojo.coords(this.domNode).w;
            if (this.minWidth && this.minWidth > neww) neww = this.minWidth;
            if (setSize) {
                this.setWidth(neww + "px");
            } else {
                this.bounds.w = neww;
                this.domNode.style.width = neww + "px";
            }
        }

        if (this.autoSizeHeight) {
            this.domNode.style.height = "";
            var newh = dojo.coords(this.domNode).h;
            if (this.minHeight && this.minHeight > neww) newh = this.minHeight;
            if (setSize) {
                this.setHeight(newh + "px");
            } else {
                this.bounds.h = newh;
                this.domNode.style.height = newh + "px";
            }
        }
        if (this.isDesignLoaded() && studio.designer.selected == this) setTimeout(dojo.hitch(studio.inspector, "reinspect"), 100);
        this._doingAutoSize = false;
    },

    setAutoSizeWidth: function(inAutoSize) {
        this.autoSizeWidth = inAutoSize;
        if (this.autoSizeWidth) {
            if (this._percEx.w) {
                this.width = this.bounds.w + "px";
                this._percEx.w = 0;
            }
            this.doAutoSize(1, 1);
        }
    },
    setAutoSizeHeight: function(inAutoSize) {
        this.autoSizeHeight = inAutoSize;
        if (this.autoSizeHeight) {
            if (this._percEx.h) {
                this.height = this.bounds.h + "px";
                this._percEx.h = 0;
            }
            this.doAutoSize(1, 1);
        }
    },

    // If its chrome, overflow needs to be turned off, then on again for autoScrolling to be enabled but for the scrollbars to be hidden.
    // Insure that only one onidle is queued per node.
    // appears to be fixed in chrome 11
    disruptChromeOverflow: function(propName) {},
    //===========================================================================
    // Rendering; forceRender is a way to skip the isReflowEnabled test
    //===========================================================================
    render: function(forceRender) {
        if (forceRender || this.isReflowEnabled()) {
            this.renderCss();
        } else {
            this.invalidCss = true;
        }
        return true;
    },

    renderCss: function() {
        if (!this.invalidCss) return;
        this.invalidCss = false;

        // these should be called only once per object
        var cssObj = this.buildCssSetterObj();
        // some browsers are faster to set via cssText... but its NOT faster to reset them via cssText using our method of appending to the css string after an initial set of values have been stored.
        if (!this.renderedOnce && (dojo.isFF || dojo.isSafari || dojo.isChrome)) {
            this.setCssViaCssText(cssObj);
            this.renderedOnce = 1;
        } else {
            this.setCssViaDom(cssObj);
        }

        // handles special case where a call to render bounds neesd to call render which calls renderCss which should NOT
        // then call renderBounds again.
        if (!this.noRenderBounds) this.renderBounds();
    },
    buildCssSetterObj: function() {
        if (!this._appliedStyles) {
            this._appliedStyles = {};
        }

        var marginSplitter = this.getCssSplitter(this.margin);
        var paddingSplitter = this.getCssSplitter(this.padding);
        var borderSplitter = this.getCssSplitter(this.border);


        if (this.margin.indexOf(",") == -1 && this.margin.indexOf(" ") != -1) {
            marginSplitter = " ";
        }

        var paddArr = this.padding.split(paddingSplitter);
        var overflow = ((this.autoScroll || this._xscrollX || this._xscrollY) && (!wm.isFakeMobile || this instanceof wm.Container == false) ? "auto" : "hidden");
        var stylesObj;

        var margins = (this.margin || "0").split(marginSplitter);
        var borders = (this.border || "0").split(borderSplitter);
        var paddings = (this.padding || "0").split(paddingSplitter);


        if (margins.length == 1) {
            margins[1] = margins[2] = margins[3] = margins[0];
        } else if (margins.length == 2) {
            margins[2] = margins[0];
            margins[3] = margins[1];
        }

        if (borders.length == 1) {
            borders[1] = borders[2] = borders[3] = borders[0];
        } else if (borders.length == 2) {
            borders[2] = borders[0];
            borders[3] = borders[1];
        }

        if (paddings.length == 1) {
            paddings[1] = paddings[2] = paddings[3] = paddings[0];
        } else if (paddings.length == 2) {
            paddings[2] = paddings[0];
            paddings[3] = paddings[1];
        }
        /* When the user zooms the browser, border, margin and padding get mucked up, and ruin all of our calculations.
         * Use the ratio in _currentZoomLevel to alter padding/margin/border so that they result in the desired number of pixels.
         * Widths of 10px are NOT altered.  Calculations break down for zoomLevel > 1.4.  High enough zoom level and browsers
         * stop mucking with pixels
         */
        if (app._currentZoomLevel && app._currentZoomLevel > 1 && app._currentZoomLevel < 1.4) {
            for (var i = 0; i < margins.length; i++) {
                if (margins[i] % 10) {
                    margins[i] *= app._currentZoomLevel;
                }
            }
            for (var i = 0; i < paddings.length; i++) {
                if (paddings[i] % 10) {
                    paddings[i] *= app._currentZoomLevel;
                }
            }
            for (var i = 0; i < borders.length; i++) {
                if (borders[i] % 10) {
                    borders[i] *= app._currentZoomLevel;
                }
            }
        }


        if (this.designBorderState) {
            stylesObj = {
                margin: (margins.join("px ") || 0) + "px",
                padding: (paddings.join("px ") || 0) + "px",
                borderLeftStyle: (this.designBorderState && this.designBorderState.l) ? "dashed" : "solid",
                borderRightStyle: (this.designBorderState && this.designBorderState.r) ? "dashed" : "solid",
                borderTopStyle: (this.designBorderState && this.designBorderState.t) ? "dashed" : "solid",
                borderBottomStyle: (this.designBorderState && this.designBorderState.b) ? "dashed" : "solid",
                borderLeftColor: (this.designBorderState && this.designBorderState.l) ? "#C1C1C1" : this.borderColor,
                borderRightColor: (this.designBorderState && this.designBorderState.r) ? "#C1C1C1" : this.borderColor,
                borderTopColor: (this.designBorderState && this.designBorderState.t) ? "#C1C1C1" : this.borderColor,
                borderBottomColor: (this.designBorderState && this.designBorderState.b) ? "#C1C1C1" : this.borderColor,
                borderLeftWidth: ((this.designBorderState && this.designBorderState.l) ? "1" : this.borderExtents.l) + "px",
                borderRightWidth: ((this.designBorderState && this.designBorderState.r) ? "1" : this.borderExtents.r) + "px",
                borderTopWidth: ((this.designBorderState && this.designBorderState.t) ? "1" : this.borderExtents.t) + "px",
                borderBottomWidth: ((this.designBorderState && this.designBorderState.b) ? "1" : this.borderExtents.b) + "px",
                backgroundColor: this.backgroundColor,

                overflowX: this.scrollX ? "auto" : overflow,
                overflowY: this.scrollY ? "auto" : overflow
            };

        } else {
            stylesObj = {
                margin: (margins.join("px ") || 0) + "px",
                padding: (paddings.join("px ") || 0) + "px",
                borderStyle: "solid",
                borderWidth: (borders.join("px ") || 0) + "px",
                borderColor: this.borderColor,
                backgroundColor: this.backgroundColor,
                overflowX: this.scrollX ? "auto" : overflow,
                overflowY: this.scrollY ? "auto" : overflow
            }
        }

        if (this.styles && !wm.isEmpty(this.styles)) {
            stylesObj = dojo.mixin(stylesObj, this.styles);
        }
        return stylesObj;
    },
    setCssViaCssText: function(cssObj) {
        if (!this.domNode) return;

        var cssTextItems = [];
        var skipItems = ["backgroundColor", "padding", "margin",
        "borderTopWidth", "borderTopStyle", "borderTopColor",
        "borderBottomWidth", "borderBottomStyle", "borderBottomColor",
        "borderLeftWidth", "borderLeftStyle", "borderLeftColor",
        "borderRightWidth", "borderRightStyle", "borderRightColor",
        "overflowX", "overflowY"];
        wm.forEachProperty(cssObj, dojo.hitch(this, function(styleValue, styleName) {
        	if (dojo.indexOf(skipItems, styleName) == -1) {
        		if (styleName == "backgroundGradient") {
		            var gradient = cssObj.backgroundGradient;
		            inValue = wm.getBackgroundStyle(gradient.startColor, gradient.endColor, gradient.colorStop, gradient.direction, "");
		            if (dojo.isIE < 10) {
		                cssTextItems.push("filter: " + inValue);
		            } else {
		                cssTextItems.push("background: " + inValue);
		            }
		        } else {
		            cssTextItems.push(styleName.replace(/([A-Z])/g, function(inLetter) {
		                return "-" + inLetter.toLowerCase();
		            }) + ":" + styleValue);
		        }
		        this._appliedStyles[styleName] = styleValue;
	        }
        }));

        /* margin/padding/border all affect the layout and sizing of widgets and can't be left to stylesheets */
        cssTextItems.push("margin:" + cssObj.margin);
        cssTextItems.push("padding:" + cssObj.padding);
        if (this.designBorderState) {
            cssTextItems.push("border-top:" + cssObj.borderTopStyle + " " + cssObj.borderTopWidth + " " + cssObj.borderTopColor);
            cssTextItems.push("border-bottom:" + cssObj.borderBottomStyle + " " + cssObj.borderBottomWidth + " " + cssObj.borderBottomColor);
            cssTextItems.push("border-left:" + cssObj.borderLeftStyle + " " + cssObj.borderLeftWidth + " " + cssObj.borderLeftColor);
            cssTextItems.push("border-right:" + cssObj.borderRightStyle + " " + cssObj.borderRightWidth + " " + cssObj.borderRightColor);
        } else {
            cssTextItems.push("border-style:" + cssObj.borderStyle);
            cssTextItems.push("border-width:" + cssObj.borderWidth);
            cssTextItems.push("border-color:" + cssObj.borderColor);
        }
        if (cssObj.backgroundColor) cssTextItems.push("background-color:" + cssObj.backgroundColor);
        cssTextItems.push("overflow-x:" + cssObj.overflowX);
        cssTextItems.push("overflow-y:" + cssObj.overflowY);
        if (wm.isMobile && dojo.isWebKit && (cssObj.overflowY == "auto" || cssObj.overflowY == "scroll")) {
            cssTextItems.push("-webkit-overflow-scrolling: touch");
        }

        // why is it +=?  So that position: absolute isn't blown away; so that any custom widget styles aren't blown away.
        // How efficient is resetting cssText (cssText is "border:5", how efficient is cssText += ";border:10" handled?)
        this.domNode.style.cssText += cssTextItems.join(";");
    },

	setCssViaDom: function(cssObj) {
	    if (!this.domNode) return;
	    var s = this.domNode.style;
	    var borderSet = false;
	    wm.forEachProperty(cssObj, dojo.hitch(this, function(styleValue, styleName) {
		try {
		    if (this.designBorderState && styleName.match(/^border/)) {
			if (!borderSet) {
			    borderSet = true;
			    s.borderLeft = cssObj.borderLeftStyle + " " + cssObj.borderLeftWidth + " " + cssObj.borderLeftColor;
			    s.borderRight = cssObj.borderRightStyle + " " + cssObj.borderRightWidth + " " + cssObj.borderRightColor;
			    s.borderTop = cssObj.borderTopStyle + " " + cssObj.borderTopWidth + " " + cssObj.borderTopColor;
			    s.borderBottom = cssObj.borderBottomStyle + " " + cssObj.borderBottomWidth + " " + cssObj.borderBottomColor;
			}
		    } else if (this._appliedStyles[styleName] != styleValue) {
			if (styleName == "backgroundGradient") {
			    var gradient = cssObj[styleName];
			    inValue = wm.getBackgroundStyle(gradient.startColor,gradient.endColor,gradient.colorStop,gradient.direction, "");
			    if (dojo.isIE < 10) {
				s.filter = inValue;
			    } else {
				s.background = inValue;
			    }
			} else {
			    s[styleName] = styleValue;
			    this._appliedStyles[styleName] = styleValue;
			}
		    }
		    if (wm.isMobile && dojo.isWebKit && (s.overflowY == "scroll" || s.overflowY == "auto")) {
			    s.WebkitOverflowScrolling = "touch";
		    }
		} catch(e) {
		    console.error("Invalid style for " + this.name + "; " + styleName + ": " + cssObj[styleName]);
		}
	    }));
	},
	getCssSplitter: function (value) {
	    var splitter = ",";
	    if (value) {
	        value = dojo.trim(String(value));
		if (value.indexOf(",") == -1 && value.indexOf(" ") != -1)
		{
		    splitter = " ";
		}
	    }
	    return splitter;
	},
	renderBounds: function() {
	    var isChanged = false;
	    if (this.dom) {
		var b = this.getStyleBounds();
		isChanged = this.dom.setBox(b, wm.AbstractEditor && this.singleLine && this instanceof wm.AbstractEditor == false);
	    }
	    // bc
	    if (this.designWrapper) {
		this.designWrapper.controlBoundsChange();
		this.designWrapper.renderBounds();
	    }
	    return isChanged;
	},
	//===========================================================================
	// Flow
	//===========================================================================
	// FIXME: controversial update implementation cribbed from Layers.js
	/*
	  beginUpdate: function() {
	  this.domNode._reflowing = true;
	  },
	  endUpdate: function() {
	  this.domNode._reflowing = false;
	  },
	*/
	reflow: function() {
	    //wm.fire(this.domNode, "reflow");
	},
	reflowParent: function() {
	    wm.fire(this.parent, "reflow");
	    //wm.fire(this.domNode.parentNode, "reflow");
	},
	setScrollX: function(inScrollX) {
	    this.scrollX = inScrollX;
	    this.invalidCss = true;
	    this.render();
	    this.reflowParent();
	},
	setScrollY: function(inScrollY) {
	    this.scrollY = inScrollY;
	    this.invalidCss = true;
	    this.render();
	    this.reflowParent();
	},
	setAutoScroll: function(inAutoScroll) {
	    this.autoScroll = inAutoScroll;
	    if (inAutoScroll) {
		if (this.isDesignLoaded() && (this.scrollX || this.scrollY)) {
		    this.scrollX = false;
		    this.scrollY = false;
                    if (studio.designer.selected == this)
			studio.inspector.reinspect();
		}
	    }

	    // Update the css without also updating the bounds (TODO: make this mechanism less cumbersome)
	    this.noRenderBounds=true;
	    this.invalidCss = true;
	    this.renderCss();
	    delete this.noRenderBounds;
	},

	//===========================================================================
	// Convenience
	//===========================================================================
	/**
	   Set <a href="#showing">showing</a> property true.
	*/
	show: function() {
	    this.setValue("showing", true);
	},
	/**
	   Set <a href="#showing">showing</a> property false.
	*/
	hide: function() {
	    this.setValue("showing", false);
	},
	/**
	   Set <a href="#disabled">disabled</a> property true.
	*/
	disable: function() {
	    this.setValue("disabled", true);
	},
	/**
	   Set <a href="#disabled">disabled</a> property false.
	*/
	enable: function() {
	    this.setValue("disabled", false);
	},
	toString: function(inText) {
	    var t = inText || "";
	    if (!this.showing)
		t += " (" + wm.getDictionaryItem("wm.Control.toString_HIDDEN") + ")";
	    return this.inherited(arguments, [t]);
	},
	//===========================================================================
	// Setters
	//===========================================================================
	setParent: function(inParent) {
	    var oldParent = this.parent;
	    var newParent = this.parent = inParent;

	    // Tricky new addition: if the parent has a containerWidget AND the parent OWNS that containerWidget, then switch parents!
	    if (inParent && inParent.containerWidget && inParent.containerWidget.owner == inParent)
		newParent = this.parent = inParent.containerWidget;

	    // If the new parent is not the same as the old parent, remove the widget from the old parent
	    // and remove the control from the old parent (Note: lookup difference between widget and control)
	    if (oldParent && oldParent != newParent) {
		oldParent.removeWidget(this);
		// BC: we still have non-container parents (e.g. wm.Dialog)
		if (oldParent.removeControl)
		    oldParent.removeControl(this);
	    }

	    if (!this._cupdating)
	    {
		if (newParent) {
		    this.appendDOMNode(newParent);
		} else if (this.domNode && this.domNode.parentNode) {
		    this.domNode.parentNode.removeChild(this.domNode);
		}
	    }

	    // If there is a new parent, add this component to its widgets and controls
	    /*
	      if (newParent) {
	      newParent.addWidget(this);
	      // BC: we still have non-container parents (e.g. wm.Dialog)
	      if (newParent.addControl)
	      newParent.addControl(this);
	      }
	      // BC: wm.Layout
	      else if (this.parentNode && this.domNode) {
	      this.parentNode.appendChild(this.domNode);
	      }
	    */
	    if (newParent && oldParent)
		dojo.publish("wmwidget-parentChange", [oldParent, newParent, this]);
	    if ((this._isDesignLoaded === undefined ? this.isDesignLoaded() : this._isDesignLoaded) && !this.owner._loadingPage && inParent instanceof wm.Container) {
		wm.job(inParent.getRuntimeId() + ".designResize", 50, function() {
		    inParent.designResizeForNewChild();
		});
	    }
	},
	appendDOMNode: function(inParent){
	    var newParent = inParent;
	    if (newParent) {
		newParent.addWidget(this);
		// BC: we still have non-container parents (e.g. wm.Dialog)
		if (newParent.addControl)
		    newParent.addControl(this);
	    }
	    // BC: wm.Layout
	    else if (this.parentNode && this.domNode) {
		var node = this.parentNode;
		node.appendChild(this.domNode);
	    }
	},
    getIndexInParent: function() {
	if (this.parent)
	    return this.parent.indexOfControl(this);
	return -1;
    },
    setIndexInParent: function(inIndex) {
	if (this.parent)
	    this.parent.moveControl(this, inIndex);
    },
	canChangeShowing: function() {
	    return true;
	},
	setShowing: function(inShowing,forceChange) {
	    var s = Boolean(inShowing);
	    if (!this.canChangeShowing())
		return;
	    // always show widgets at design time whose showing property is bound
	    if (this._isDesignLoaded && this.$.binding && this.$.binding.wires.showing) {
		s = true;
	    }
	    if (forceChange || this.showing != s) {
		this.showing = s;
		this.domNode.style.display = s ? '' : 'none';
		this.reflowParent();
	    }
	},
	/**
	   Set disabled property for this widget.<br/>
	   <br/>
	   Some widgets change behavior or display based on the disabled state.<br>
	   @param {Boolean} inDisabled True to set disabled.
	*/
	setDisabled: function(inDisabled) {
	    var d = Boolean(inDisabled);
	    this.disabled = d;
	    this._disabled = d || this._parentDisabled;

	    wm.forEachProperty(this.widgets, dojo.hitch(this, function(w, name) {
		w.setParentDisabled(this._disabled);
	    }));

	    dojo.toggleClass(this.domNode, "Disabled", this._disabled);
	},
    setParentDisabled: function(inDisabled) {
	this._parentDisabled = inDisabled;
	this.setDisabled(this.disabled);
    },
	setBackgroundColor: function(inColor) {
	    this.backgroundColor = inColor;
	    this.invalidCss = true;
	    this.render();
	},
	setBorderColor: function(inColor) {
	    this.borderColor = inColor;
	    this.invalidCss = true;
	    this.render();
	},
	//===========================================================================
	// Default and User Style Classes
	//===========================================================================
	addRemoveDefaultCssClass: function(inAdd) {
	    if (this.owner)
		dojo[inAdd ? "addClass" : "removeClass"](this.domNode, this.owner.declaredClass + '-' + this.name);
	},
	getUserNodeClasses: function(inNodeName) {
	    var klasses = this._classes;
	    for (var i in klasses) {
		if (inNodeName == i)
		    return klasses[i].join(' ');
	    }
	    return "";
	},
	initUserClasses: function() {
	    // bc
	    if (dojo.isArray(this._classes))
		this._classes = {domNode: this._classes};
	    var klasses = this._classes;
	    for (var i in klasses)
		this.initUserNodeClasses(klasses[i], i);
	},
	initUserNodeClasses: function(inClasses, inNodeName) {
	    var k = inClasses || [], n = this[inNodeName];
	    if (n)
		// add classes together for speed; we don't care about checking if the class is already on the node
		dojo.addClass(n, k.join(' '));
	},
	/**
	   Add CSS class to a widget node.<br/>
	   @param {String} inClass The class to add.
	   @param {String} inNodeName (Optional) a property in this widget that references a node.
	   If ommitted, the default node is used.
	   @example this.panel.addUserClass("hilite-border");
	*/
	addUserClass: function(inClass, inNodeName) {
	    inNodeName = inNodeName || "domNode";
	    var cs = this._classes[inNodeName] = this._classes[inNodeName] || [];
	    cs.push(inClass);
	    var n = this[inNodeName];
	    if (n)
		dojo.addClass(n, inClass);
	},
	/**
	   Remove a CSS class from a widget node.<br/>
	   @param {String} inClass The class to remove.
	   @param {String} inNodeName (Optional) a property in this widget that references a node.
	   If ommitted, the default node is used.
	   @example this.panel.removeUserClass("hilite-border");
	*/
    removeUserClass: function(inClass, inNodeName) {
        inNodeName = inNodeName || "domNode";
        var n = this[inNodeName];
        if (n) dojo.removeClass(n, inClass);
        var cs = this._classes[inNodeName] || [];
        for (var i = 0, c; c = cs[i]; i++) {
            if (c == inClass) {
                cs.splice(i--, 1);
            }
        }
        if (!cs.length) delete this._classes[inNodeName];
    },

    setStyle: function(inStyle, inValue) {
        if (inValue === undefined || inValue === null) inValue = "";
        if (inStyle == "border" || inStyle == "borderColor" || inStyle == "margin" || inStyle == "padding") {
            return this.setProp(inStyle, inValue);
        }

        if (!this.styles) {
            this.styles = {};
        }
        if (inValue === null || inValue === undefined) {
            delete this.styles[inStyle];
        } else {
            this.styles[inStyle] = inValue;
        }
        if (inStyle == "backgroundGradient") {
            if (inValue) {
                inValue = wm.getBackgroundStyle(inValue.startColor, inValue.endColor, inValue.colorStop, inValue.direction, "");
            } else {
                inValue = "";
            }
            if (dojo.isIE < 10) {
                this.domNode.style.filter = inValue;
            } else {
                this.domNode.style.background = inValue;
            }
        } else {
            this.domNode.style[inStyle] = inValue;
        }
    },
    getStyle: function(inStyle) {
        if (inStyle == "border" || inStyle == "borderColor" || inStyle == "margin" || inStyle == "padding") {
            return this.getProp(inStyle);
        } else if (!this.styles) {
            return "";
        } else {
            return this.styles[inStyle] !== undefined ? this.styles[inStyle] : "";
        }
    },

	getOrderedWidgets: function() {
	    return [];
	},
	updatingEvent: function (prop, inValue){
	},

    // Only if you subscribe to these are these connected; if you subscribe then the event stops here
    onRightClick: function(event){
    },
    onMouseOver: function(event){
    },
    onMouseOut: function(event){
    },


    toHtml: function() {return "";},
    toHtmlStyles: function() {
        var style = ""; //"style='margin: " + this.margin + ";padding: " + this.padding + ";'";
        if (this.styles) {
            wm.forEachProperty(this.styles, function(value, name) {
                if (style) style += ";";
                style += name.replace(/([A-Z])/g, function(inLetter) {
                    return "-" + inLetter.toLowerCase();
                }) + ": " + value;
            });
            if (style) style = "style='" + style + "'";
        }
        return style;
    },
    customToHtml: function(inWidth) {return "";},
    print: function() {
        var html = this.toHtml(725); // 725px wide page
        var csspath = dojo.moduleUrl("wm.base.widget.themes.default").path + "print.css";
        var wavemakercsspath = dojo.moduleUrl("wm.base.styles").path + "wavemaker.css";
        var page = this.getParentPage();
        if (page) {
            var name = page.declaredClass;
            var css = wm.load("pages/" + name + "/" + name + ".css");
        }
        html = "<html><head><title>Printing " + app.declaredClass + "</title><link rel='stylesheet' type='text/css' href='" + csspath + "' /><link rel='stylesheet' type='text/css' href='" + wavemakercsspath + "'/><link rel='stylesheet' href='print.css'/>" + (css ? "<style>" + css + "</style>" : "") + "</head><body onload='print()'>" + html + "</body><html>";
        var win = window.open("", "Printing");
        if (win) {
            win.document.open("text/html");
            win.document.write(html);
            win.document.close();
        }
    },

	setHint: function(inHint) {
	    this.hint = inHint;
	    if (inHint) {
		this.createMouseOverConnect();
		this.createMouseOutConnect();
	    }
	},
	createMouseOverConnect: function() {
	    if (this.findConnection("onmouseover")) return;
	    var self = this;
	    this.connect(this.domNode, "onmouseover", function(e) {
		wm.job(self.getRuntimeId() + "MouseOverEvents", 50, function() {
		    self.mouseOver(e);
		});
	    });
	},
	createMouseOutConnect: function() {
	    if (this.findConnection("onmouseout")) return;
	    var self = this;
	    this.connect(this.domNode, "onmouseout", function(e) {
		wm.job(self.getRuntimeId() + "MouseOverEvents", 50, function() {
		    self.mouseOut(e);
		});
	    });
	},
	mouseOver: function(event) {
	    if (this.hint) {
		var self = this;
		wm.cancelJob("app.hint");
		var isShowing =  (app.toolTipDialog && app.toolTipDialog.showing);
		wm.job("app.hint", isShowing ? 0 : 1500, function() {
		    if (!self.isAncestorHidden()) {
			app.createToolTip(self.hint, self.domNode, event, self);
		    }
		});

	    }
	    this.onMouseOver(event);
	    dojo.stopEvent(event);
	},
	mouseOut: function(event) {
	    if (this.hint && app.toolTipDialog && (app.toolTipDialog.showing || wm.hasJob("app.hint"))) {
		var self = this;
		wm.job("app.hint", 500, function() {
		    if (self == app.toolTipDialog.tipOwner)
			app.hideToolTip();
		});
	    }
	    this.onMouseOut(event);
	    dojo.stopEvent(event);
	},
	onMouseOver: function(event){},
    onMouseOut: function(event){},
    getParentForm: function() {
	var w = this.parent;
	var r = this.getRoot();
	r = r && r.root;
	while (w && w != r) {
	    if (wm.isInstanceType(w, [wm.LiveFormBase, wm.DataForm])) {
			return w;
		}
		w = w.parent;
	}
    },

	setImageList: function(inImageList) {
		this.imageList = inImageList;
		this.imageListChanged();
	},
	setImageIndex: function(inImageIndex) {
		if (inImageIndex !== undefined) {
		    this.imageIndex = Number(inImageIndex);
			this.imageListChanged();
		}
	},
	imageListChanged: function() {
		var iln = this.findImageList();
		this._imageList = iln ? iln instanceof wm.ImageList ? iln : this.owner.getValueById(iln) : null;
	        this.invalidCss = true;
	    this.render(true,true);
	},
    getCurrentImageIndex: function() {
	    return this.imageIndex;
    },
	findImageList: function() {
		var t = this;
		while (t && !t.imageList) {
			t = t.parent;
		}
		return t ? t.imageList : null;
	},
        update: function() {
	    this.show();
	    if (this.parent) {
		this.parent.update();
	    }
	}

    });

// layout specific

/*
  wm.Control.extend({
  //fluidSize: 0,
  //alignInParent: "justified",
  //setFluidSize: function(inFluidSize) {
  //	this.fluidSize = inFluidSize;
  //	this.reflowParent();
  //}
  });

  wm.Object.extendSchema(wm.Control, {
  //fluidSize: {group: "layout"},
  });
*/

dojo.declare("wm.TouchMixin", null, {
    addTouchListener: function(optionalNode) {
        if (!this._subscriptions) {
            this._subscriptions = [];
            this._connections = [];
            this._debugSubscriptions = [];
            this.subscribe = function() {
                wm.Component.prototype.subscribe.apply(this, arguments);
            };
            this.connect = function() {
                wm.Component.prototype.connect.apply(this, arguments);
            };
            this.disconnectEvent = function() {
                wm.Component.prototype.disconnectEvent.apply(this, arguments);
            };
            // also needs a getRuntimeId method
        }
        this.connect(optionalNode || this.domNode, wm.isFakeMobile ? "mousedown" : "touchstart", this, "_onTouchStart");
        if (!wm.isFakeMobile) {
            this.connect(optionalNode || this.domNode, "touchmove", this, "_onTouchMove");
            this.connect(optionalNode || this.domNode, "touchend", this, "_onTouchEnd");
        }
        this.subscribe("wmTouchMove", dojo.hitch(this, function() {
            wm.cancelJob(this.getRuntimeId() + ".longClick");
        }));
    },
    _onTouchStart: function(e) {
        this._touchMoved = false;
        var target;
        if (e.targetTouches) {
            if (e.targetTouches.length) {
                this._touchStartY = e.targetTouches[0].clientY;
                this._touchStartX = e.targetTouches[0].clientX;
                target = e.targetTouches[0].target;
            }
        } else if ("clientY" in e) {
            this._touchStartY = e.clientY;
            this._touchStartX = e.clientX;
            target = e.target;
            this.connect(document.body, "mousemove", this, "_onTouchMove");
            this.connect(document.body, "mouseup", this, "_onTouchEnd");
        } else {
            delete this._touchStartY;
            delete this._touchStartX;
        }
        if ("_touchStartY" in this) {
            this._touchLastY = this._touchStartY;
            this._touchLastX = this._touchStartX; /* Return any value to declare this touch event ignored */
            if (this.onTouchStart(e, target)) {
                this.disconnectEvent("mousemove");
                this.disconnectEvent("mouseup");
            } else {
                wm.job(this.getRuntimeId() + ".longClick", 1000, this, "_onLongTouch");
            }
        }
    },
    _onLongTouch: function() {
        this.onLongTouch(this._touchStartX, this._touchStartY);
        this._onTouchEnd(null, true);
    },
    onTouchStart: function(event) {},
    _onTouchMove: function(e) {
        //  e.preventDefault(); // commented out so that touching a button and then moving will count as scrolling
        var dyInitial, dyLatest, dxInitial, dxLatest;
        if (e.targetTouches) {
            if (e.targetTouches.length != 1) {
                return false;
            }
            dyInitial = e.targetTouches[0].clientY - this._touchStartY;
            dyLatest = e.targetTouches[0].clientY - this._touchLastY;
            dxInitial = e.targetTouches[0].clientX - this._touchStartX;
            dxLatest = e.targetTouches[0].clientX - this._touchLastX;
            this._touchLastY = e.targetTouches[0].clientY;
            this._touchLastX = e.targetTouches[0].clientX;
        } else {
            dyInitial = e.clientY - this._touchStartY;
            dyLatest = e.clientY - this._touchLastY;
            dxInitial = e.clientX - this._touchStartX;
            dxLatest = e.clientX - this._touchLastX;
            this._touchLastY = e.clientY;
            this._touchLastX = e.clientX;
        }
        var posY = this._touchStartY + dyInitial;
        var posX = this._touchStartX + dxInitial;



        /* If the finger has moved more than 5 pixels, its not an accidental move; */
        if (!this._touchMoved && (Math.abs(dyInitial) > 5 || Math.abs(dxInitial) > 5)) {
            this._touchMoved = true;
            wm.cancelJob(this.getRuntimeId() + ".longClick");
        }
        if (this._touchMoved) {
            this.onTouchMove(e, posY, dyInitial, dyLatest, posX, dxInitial, dxLatest);
        }
    },
    onTouchMove: function(event, yPosition, yChangeFromInitial, yChangeFromLast, xPosition, xChangeFromInitial, xChangeFromLast) {},
    _onTouchEnd: function(e, noEvents) {
        wm.cancelJob(this.getRuntimeId() + ".longClick");
        this.disconnectEvent("mousemove");
        this.disconnectEvent("mouseup");
        if (!noEvents) {
            this.onTouchEnd(e, this._touchMoved);
            if (!this._touchMoved) {
                this.onTouch(this._touchStartX, this._touchStartY);
            }
        }
    },
    onTouchEnd: function(event, isMove) {},
    onTouch: function(posX, posY) {},
    onLongTouch: function(posX, posY) {}
});

dojo.declare("wm.TouchScrollMixin", wm.TouchMixin, {
    onTouchStart: function(event) {
        this._touchTime = new Date().getTime();
        if (this._touchAnimationId) {
            window.clearInterval(this._touchAnimationId);
        }
    },
    onTouchMove: function(event, yPosition, yChangeFromInitial, yChangeFromLast, xPosition, xChangeFromInitial, xChangeFromLast) {
        var node = this._scrollNode || this.domNode;
        node.scrollTop -= yChangeFromLast;
        var newTime = new Date().getTime();
        if (this._touchTime != newTime) {
            this._touchVelocity = yChangeFromLast / (this._touchTime - newTime);
            this._touchTime = newTime;
        }
        dojo.stopEvent(event);
    },
    onTouchEnd: function(event, isMove) {

        if (isMove) {
            if (this._touchVelocity != Infinity && Math.abs(this._touchVelocity) > 0.15) {
                if (this._touchAnimationId) {
                    window.clearInterval(this._touchAnimationId);
                }
                this._touchAnimationId = window.setInterval(dojo.hitch(this, "_onAnimateScroll"), 50);
            }
        }
    },
    _onAnimateScroll: function() {
        var node = this._scrollNode || this.domNode;
        this._touchVelocity *= 0.9;
        var top = node.scrollTop;
        node.scrollTop = node.scrollTop + this._touchVelocity * 50;
        var newTop = node.scrollTop;
        var diff = Math.abs(newTop - top);
        if (diff <= 1) {
            window.clearInterval(this._touchAnimationId);
        }
    }

});


if (wm.isMobile) {
    dojo.declare("wm.TouchMixinOptional", wm.TouchMixin,{});

} else {
    dojo.declare("wm.TouchMixinOptional", null,{
	onLongTouch: function(posX, posY) {}
    });
}

if (wm.isIOS <= 4 || wm.isAndroid <= 2 || wm.isFakeMobile) {
    dojo.declare("wm.TouchScrollMixinOptional", wm.TouchScrollMixin, {});
} else {
    dojo.declare("wm.TouchScrollMixinOptional", null, {});
}
wm.Widget = wm.Control;
dojo.declare("wm.Box", wm.Widget, {}); // mostly obsolete
