/*
 *  Copyright (C) 2011-2012 VMware, Inc. All rights reserved.
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

dojo.provide("wm.base.components.Variable_design");
dojo.require("wm.base.components.Variable");
dojo.require("wm.base.Component_design");


//===========================================================================
// Design Time Extensions
//===========================================================================
wm.Object.extendSchema(wm.Variable, {
    /* Events group */
    onPrepareSetData: {events: ["js","sharedjs", "sharedEventHandlers"], advanced: 1},
    onSetData: {advanced: 1},

    /* Data group; type subgroup */
    type: {ignore: 0, group: "data", subgroup: "type", order: 1, editor: "wm.prop.DataTypeSelect", editorProps: {liveTypes: 0}, requiredGroup: 1},
    isList: { group: "data", subgroup: "type", order: 4, requiredGroup: 1},
    editJson: {operation: 1, group:"data", subgroup: "data", order:5, shortname: "Edit JSON"},

    /* Data group; custom subgroup */
    dataSet: { bindTarget: 1, group: "dataSet", order: 0, defaultBindTarget: 1, isObject: true, editor: "wm.prop.FieldGroupEditor"},
    isEmpty: {ignore: 1, bindSource: 1, type: "boolean"},
    count: {ignore: 1, bindSource: 1, type: "number"},
    queriedItems: {ignore: 1, bindSource: 1},

    /* Data group; behavior subgroup */
    saveInCookie: {group: "data", subgroup: "behavior", order: 20, advanced:1},

    /* Mobile group */
    saveInPhonegap: {group: "mobile", order: 1, advanced: 1},

    /* Common group */
    owner: {ignore:0},

    /* Hidden group */
    json: {hidden:1, group: "data", order: 5},

    /* Ignored group */
    data: { ignore: 1 },
    cursor: { ignore: 1},
    isPrimitive: { ignore: 1},

    /* Methods group */
    removeItem: {method:1},
    setData: {method:1},
    addItem: {method:1},
    setItem: {method:1},
    setJson: {method:1},
    removeItem: {method:1},
    clearData: {method:1},
    sort: {method:1},
    query: {method:1},
    setQuery: {method:1},
    forEach: {method:1},
    map: {method:1},
    getCount: {method:1, returns: "Number"},
    getData: {method:1, returns: "Any"},
    getItem: {method:1, returns: "wm.Variable"}
});


wm.Variable.extend({
    listProperties: function() {
	var props = this.inherited(arguments);
	props.queriedItems.type = this.type;
	props.queriedItems.isList = true;
	props.queriedItems.bindSource = this.isList;
	return props;
    },
    editJson: function() {
        studio.editVariableDialog.show();
        studio.editVariableDialog.page.reset(this);
    },
    isListBindable: function() {
        return this.isList;
    },
    /* Called whe user uses the property panel to set type */
    set_type: function(inType) {
        this.setType(inType);
        if (this.json) this.setJson(this.json);
    }
});