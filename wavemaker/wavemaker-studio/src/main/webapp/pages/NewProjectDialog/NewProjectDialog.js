/*
 * Copyright (C) 2010-2012 VMware, Inc. All rights reserved.
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


dojo.declare("NewProjectDialog", wm.Page, {
    i18n: true,
    selectedTemplate: null,
    start: function() {
        this.themeName.setDataValue("wm_default");

        var templates = wm.fullTemplates;
        var templateList = [];
        var i = 0;

        var panel = new wm.Panel({
            width: "100%",
            height: "128px",
            layoutKind: "left-to-right",
            parent: this.desktopTemplatesInsertPanel,
            owner: this,
            name: "templateRow" + i
        });
        var imgpanel = new wm.Panel({
            _classes: {
                domNode: ["SelectableTemplate", "Selected"]
            },
            layoutKind: "top-to-bottom",
            parent: panel,
            owner: this,
            name: "templatepanel_",
            margin: "4",
            border: "1",
            borderColor: "#888888",
            width: "112px",
            height: "120px"
        });
        var firstimgpanel = imgpanel;
        this.noneTarget = imgpanel;
        var img = new wm.Picture({
            width: "100%",
            height: "100px",
            parent: imgpanel,
            owner: this,
            name: "template" + i
        });
        img.domNode.style.backgroundImage = "none";

        var label = new wm.Label({
            "width": "100%",
            height: "20px",
            parent: imgpanel,
            owner: this,
            name: "templatelabel" + i,
            caption: "None"
        });
        i++;
        var groupNames = [undefined];
        wm.forEachProperty(templates, function(template, templateName) {
            if (dojo.indexOf(groupNames, template.templateGroup) == -1) {
                groupNames.push(template.templateGroup);
            }
        });
        dojo.forEach(groupNames, function(groupName) {
            this.addTemplates(templates, panel, groupName, i);
            i = 0;
        }, this);
        dojo.query(".SelectableTemplate", this.tabs.domNode).connect("onclick", this, "templateClicked");
        dojo.query(".SelectableTemplate", this.tabs.domNode).connect("dblclick", this, "templateDblClicked");
        this.templateClicked2(firstimgpanel);
        wm.onidle(this, function() {
            this.reflow();
        });
    },
    addTemplates: function(templates, panel, templateGroup, i) {
        for (var templateKey in templates) {
            var template = templates[templateKey];
            if (!templateGroup && !template.templateGroup || templateGroup == template.templateGroup) {
                var layer = !templateGroup ? this.desktopTemplatesInsertLayer : this.tabs.getLayerByCaption(templateGroup);
                if (!layer) {
                    layer = this.tabs.addLayer(templateGroup, true);
                    layer.setPadding("8");
                    new wm.Panel({
                        owner: this,
                        parent: layer,
                        width: "100%",
                        height: "100%",
                        horizontalAlign: "left",
                        verticalAlign: "top"
                    });
                }
                var parent = layer.c$[0];
                if (i % 3 === 0) {
                    panel = new wm.Panel({
                        width: "100%",
                        height: "128px",
                        layoutKind: "left-to-right",
                        parent: parent,
                        owner: this,
                        name: "templateRow" + layer.name + i
                    });
                }
                var imgpanel = new wm.Panel({
                    _classes: {
                        domNode: ["SelectableTemplate"]
                    },
                    layoutKind: "top-to-bottom",
                    parent: panel,
                    owner: this,
                    name: "templatepanel_" + layer.name + templateKey,
                    margin: "4",
                    border: "1",
                    borderColor: "#888888",
                    width: "112px",
                    height: "120px"
                });
                var img = new wm.Picture({
                    width: "100%",
                    height: "100px",
                    parent: imgpanel,
                    owner: this,
                    name: "template" + layer.name + i
                });
                if (template.thumbnail) {
                    img.domNode.style.backgroundImage = "url(" + template.thumbnail + ")";
                }
                var label = new wm.Label({
                    "width": "100%",
                    height: "20px",
                    parent: imgpanel,
                    owner: this,
                    name: "templatelabel" + layer.name + i,
                    caption: template.displayName || templateKey
                });
                i++;
            }
        }
    },
    reset: function() {
        var projectNames = {};
        var projects = studio.startPageDialog.page.projectList;
        var l = {};
        dojo.forEach(projects, dojo.hitch(this, function(p) {
            projectNames[p] = true;
        }));
        var newname = wm.findUniqueName("Project", [projectNames]);
        this.projectName.setDataValue(newname);
    },
    clearSelection: function() {
        if (this.selectedTemplate) {
            this.selectedTemplate.setBorderColor("#888888");
            this.selectedTemplate.setBorder("1");
            dojo.removeClass(this.selectedTemplate.domNode, "Selected");
            this.selectedTemplate = null;
        }
    },
    templateDblClicked: function(inMouseEvent) {
        var target = wm.getWidgetByDomNode(inMouseEvent.target);
        while(target && !dojo.hasClass(target.domNode, "SelectableTemplate"))
            target = target.parent;
        if (!target) return;
        if (target != this.selectedTemplate) {
        this.templateClicked2(target);
        }
        this.onOkClick();
    },
    templateClicked: function(inMouseEvent) {
        var target = wm.getWidgetByDomNode(inMouseEvent.target);
        while(target && !dojo.hasClass(target.domNode, "SelectableTemplate"))
            target = target.parent;
        if (!target) return;
        if (target == this.selectedTemplate) return;
    this.templateClicked2(target);
    },
    templateClicked2: function(inTarget) {
        this.clearSelection();
        this.selectedTemplate = inTarget;
        this.selectedTemplate.setBorderColor("#333333");
        this.selectedTemplate.setBorder("2");
        dojo.addClass(inTarget.domNode, "Selected");
    },
    onCancelClick: function() {
        this.owner.owner.dismiss();
    },
    onOkClick: function() {
        try {

            var projectNames = {};
            var projects = studio.project.getProjectList();
            var l = {};
            dojo.forEach(projects, dojo.hitch(this, function(p) {
                projectNames[p.toLowerCase()] = true;
            }));


            if (projectNames[this.projectName.getDataValue().toLowerCase()]) {
                var newname = wm.findUniqueName(this.projectName.getDataValue().toLowerCase(), [projectNames]);
                newname = wm.capitalize(newname);
                app.createToastDialog();
                app.toastDialog.showToast(this.getDictionaryItem("TOAST_NAME_TAKEN", {
                    oldName: this.projectName.getDataValue(),
                    newName: newname
                }), 8000, "Warning", "tc");
                this.projectName.setDataValue(newname);
            } else {
                this._onOkClick();
                this.owner.owner.dismiss();
            }

        } catch (e) {}
    },
    _onOkClick: function() {
        var templateName = this.selectedTemplate.name;
        var layer = this.selectedTemplate.isAncestorInstanceOf(wm.Layer);
        templateName = templateName.substring(layer.name.length + "templatepanel_".length);
        studio.project.newProject(this.projectName.getDataValue(), this.themeName.getDataValue(), wm.fullTemplates[templateName]);
    },
  _end: 0
});
