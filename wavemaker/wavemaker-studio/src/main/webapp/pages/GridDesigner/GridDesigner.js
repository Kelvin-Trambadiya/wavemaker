/*
 *  Copyright (C) 2012 VMware, Inc. All rights reserved.
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
dojo.declare("GridDesigner", wm.Page, {
    start: function() {
        wm.typeManager.types.gridDefinitionType.fields.field.include = ["update"];
        this._editors = [];
        wm.forEachWidget(this.root, dojo.hitch(this, function(w) {
            if (w instanceof wm.AbstractEditor) {
                this._editors.push(w);
            }
        }));

        this.subscribe("deviceSizeRecalc", this, "reselectGrid");
    },
    updateFormatterList: function(){
        this.fullFormattersVar.setData(this.formattersVar);
        dojo.forEach(getAllEventsInCode(), dojo.hitch(this, function(f){
            if (f.match(/Format$/))
            this.fullFormattersVar.addItem({name:f, dataValue:f});
        }));
            this.fullFormattersVar.addItem({name:studio.getDictionaryItem("wm.DojoGrid.ADD_FORMATTER"), dataValue:"- Add Formatter"});
    },
    updateDataSets: function() {
        var list = [{
            dataValue: ""
        }];
        wm.listMatchingComponentIds([studio.page, studio.application], function(c) {
            if (c instanceof wm.Variable && c.isList && c.name && c.name.indexOf("_") != 0) {
                list.push({
                    dataValue: c.getId()
                });
            }
        });
        this.liveSourceVar.setData(list);
    },
    /* Called when deviceType changes, triggering the selected grid to be destroyed, recreated, and our current grid to be destroyed and
     * in need of reselection */
    reselectGrid:function() {
        wm.onidle(this, function() {
            this.currentGrid = app.getValueById(this.currentGridOwnerId + "." + this.currentGrid.name);
        });
    },
    setGrid: function(inGrid) {
        this.currentGrid = inGrid;
        this.currentGridOwnerId = inGrid.owner.getRuntimeId();
        this.editorPanels.setShowing(inGrid instanceof wm.DojoGrid); // hide if its wm.List
        this.currentDataSet = inGrid.dataSet;
        this.initialColumns = inGrid.columns;

        var columns = dojo.clone(inGrid.columns);
        columns = dojo.filter(columns, function(col) {
            return !col.controller;
        });
        var phoneIndex = -1;
        var hasPhoneColumn = false;
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].field == "PHONE COLUMN") {
                phoneIndex = i;
                hasPhoneColumn = true;
            } else if (columns[i].mobileColumn) {
                hasPhoneColumn = true;
            } else {
                columns[i].mobileColumn = false;
            }
        }
        /* Only needed for upgraded projects from before we had PHONE COLUMN */
        var updateGrid = false;
        if (!hasPhoneColumn) {
            updateGrid = true;
            columns.push({
                show: false,
                // does NOT show on desktop
                field: "PHONE COLUMN",
                title: "-",
                width: "100%",
                align: "left",
                expression: "",
                mobileColumn: true
            }); // DOES show on phone
            phoneIndex = columns.length - 1;
        }
        this.columnsVar.setData(columns);
        if (phoneIndex != -1) {
            this.phoneColumn = this.columnsVar.getItem(phoneIndex);
        }
        if (updateGrid) {
            this.updateGrid();
        } else {
            this.regenerateMobileColumn();
        }
        this.updateFormatterList();
        this.updateDataSets();
    },
    regenerateMobileColumn: function() {
        if (!this.phoneColumn || this.phoneColumn.getValue("isCustomField")) return;
        var data = this.columnsVar.getData();
        wm.List.prototype.regenerateMobileColumn(data);

        if (studio.currentDeviceType != "phone") this.phoneColumn.beginUpdate();
        this.columnsVar.setData(data);
        if (studio.currentDeviceType != "phone") this.phoneColumn.endUpdate();
/*
        var mobileExpr = "";
        var count = this.columnsVar.getCount();


        for (var i = 0; i < count; i++) {
            var column = this.columnsVar.getItem(i).getData();
            if (!column.mobileColumn && column.show) {

                if (column.expression) {
                    // don't even TRY to handle this
                } else {
                    var value = "\${" + column.field + "}";
                    var formatProps = column.formatProps ? dojo.toJson(column.formatProps) : "{}";
                    if (column.formatFunc) {
                        switch (column.formatFunc) {
                        case "wm_date_formatter":
                        case 'Date (WaveMaker)':
                        case 'wm_localdate_formatter':
                        case 'Local Date (WaveMaker)':
                            value = "wm.List.prototype.dateFormatter(" + formatProps + ", null,null,null," + value + ")";
                            break;
                        case 'wm_number_formatter':
                        case 'Number (WaveMaker)':
                            value = "wm.List.prototype.numberFormatter(" + formatProps + ", null,null,null," + value + ")";
                            break;
                        case 'wm_currency_formatter':
                        case 'Currency (WaveMaker)':
                            value = "wm.List.prototype.currencyFormatter(" + formatProps + ", null,null,null," + value + ")";
                            break;
                        case 'wm_image_formatter':
                        case 'Image (WaveMaker)':
                            value = "wm.List.prototype.imageFormatter(" + formatProps + ", null,null,null," + value + ")";
                            break;
                        case 'wm_link_formatter':
                        case 'Link (WaveMaker)':
                            value = "wm.List.prototype.linkFormatter(" + formatProps + ", null,null,null," + value + ")";
                            break;
                        case "wm_array_formatter":
                            value = "wm.List.prototype.arrayFormatter(\"" + column.field + "\"," + formatProps + ", null,null,null," + value + ")";
                            break;
                        case 'wm_button_formatter':
                            value = "wm.List.prototype.buttonFormatter(\"" + column.field + "\"," + formatProps + ", null,null,null," + value + ", ${wm.rowId})";
                            break;
                        }
                    }
                    if (value) {
                        if (!mobileExpr) {
                            mobileExpr = "\"<div class='MobileRowTitle'>" + wm.capitalize(column.title) + ": \" + " + value + " + \"</div>\"\n";
                        } else {
                            mobileExpr += "+ \"<div class='MobileRow'>" + wm.capitalize(column.title) + ": \" + " + value + " + \"</div>\"\n";
                        }
                    }
                }
            }
        }
*/

    },
    getColumnByField: function(inName) {
        for (var i = 0; i < this.currentGrid.columns.length; i++) {
            if (this.currentGrid.columns[i].field == inName) return this.currentGrid.columns[i];
        }
    },
    moveUp: function(inSender) {
        var item = this.grid.selectedItem.getData();
        var selectedIndex = this.grid.getSelectedIndex();
        if (selectedIndex <= 0) return;
        this.columnsVar.beginUpdate();
        this.columnsVar.removeItem(selectedIndex);
        this.columnsVar.addItem(item, selectedIndex - 1);
        this.columnsVar.endUpdate();
        this.columnsVar.notify();
        this.updateGrid();
    },
    moveDown: function(inSender) {
        var item = this.grid.selectedItem.getData();
        var selectedIndex = this.grid.getSelectedIndex();
        if (selectedIndex == -1 || selectedIndex >= this.columnsVar.getCount()) return;
        this.columnsVar.beginUpdate();
        this.columnsVar.removeItem(selectedIndex);
        this.columnsVar.addItem(item, selectedIndex + 1);
        this.columnsVar.endUpdate();
        this.columnsVar.notify();
        this.updateGrid();
    },
    addButtonClick: function(inSender) {
        try {
            var newName = "customField";
            for (var i = 0; this.getColumnByField(newName + i); i++) {}

            app.prompt("Enter an ID/fieldName for this column; this must be a unique name", newName + i, dojo.hitch(this, function(inResult) {
                if (inResult && !this.getColumnByField(inResult)) {
                    this.grid.deselectAll();
                    this.grid.selectedItem.setDataSet(null);
                    this.columnsVar.addItem({
                        field: inResult,
                        width: "100%",
                        title: wm.capitalize(inResult),
                        align: "left",
                        isCustomField: true,
                        show: true
                    });
                    this.updateGrid();
                    window.setTimeout(dojo.hitch(this, function() {
                        this.grid.select(this.grid.getRowCount() - 1);
                    }), 1000);
                }
            }));
        } catch (e) {
            console.error('ERROR IN addButtonClick: ' + e);
        }
    },
    deleteButtonClick: function(inSender) {
        var row = this.grid.getSelectedIndex();
        if (row == -1) return;
        this.columnsVar.removeItem(row);
        this.updateGrid();
        window.setTimeout(dojo.hitch(this, function() {
            this.grid.select(0);
        }), 10);

    },
    onColumnSelect: function(inSender) {
        this.onFormatChange(this.formatEditor, this.formatEditor.getDisplayValue(), this.formatEditor.getDataValue(), true);
        this.onEditFieldChange(this.editorSelector, this.editorSelector.getDisplayValue(), this.editorSelector.getDataValue(), true);
        this.updateRestrictValues();
    },
    changeItem: function(inName, inValue, optionalRowIndex) {
        if (this.columnsVar.isEmpty()) return;
        var row = (optionalRowIndex === undefined) ? this.grid.getSelectedIndex() : optionalRowIndex;
        if (row == -1) return;

        var item = this.columnsVar.getItem(row);

        if (item.getValue("field") == "PHONE COLUMN" && inName == "expression") {
            item.beginUpdate();
            item.setValue("isCustomField", true);
            item.endUpdate();
        }

        if (item.getValue(inName) != inValue) {
            item.beginUpdate(); // we don't need to regenerate the grid when this item changes
            this.grid.selectedItem.beginUpdate();
            item.setValue(inName, inValue);
            this.grid.selectedItem.setValue(inName, inValue);
            item.endUpdate();
            this.grid.selectedItem.endUpdate();

            if (item.getValue("field") != "PHONE COLUMN") {
                this.regenerateMobileColumn();
            }

            this.updateGrid(row);

            return true;
        }
        return false;
    },
    updateGrid: function() {
        this.regenerateMobileColumn();
        var columns = this.columnsVar.getData();
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            if (col.editorProps) {
                for (var name in col.editorProps) {
                    if (col.editorProps[name] === null) delete col.editorProps[name];
                }
            }
            if (col.constraints) {
                for (var name in col.constraints) {
                    if (col.constraints[name] === null) delete col.constraints[name];
                }
            }
            if (col.formatProps) {
                for (var name in col.formatProps) {
                    if (col.formatProps[name] === null) delete col.formatProps[name];
                }
            }
        }
        this.setGridColumns(columns);
    },
    setGridColumns: function(inColumns) {
        /* Standard grid */
        if (this.currentGrid.isDesignLoaded() && !wm.isInstanceType(this.currentGrid.owner, wm.Composite)) {
            this.currentGrid.set_columns(inColumns);
        }

        /* Composite */
        else if (this.currentGrid.owner.isDesignLoaded() && wm.isInstanceType(this.currentGrid.owner, wm.Composite)) {
            var composite = this.currentGrid.owner;
            var publishedProps = composite.constructor.prototype.published;
            wm.forEachProperty(publishedProps, dojo.hitch(this, function(schema, name) {
                if (schema.target == this.currentGrid.name && schema.property == "columns") {
                    this.currentGrid.owner["set" + wm.capitalize(schema.name)](inColumns);
                }
            }));
        }

        /* PageContainer property allows editing of grid columns */
        else if (this.currentGrid.owner.owner.isDesignLoaded()) {
            var p = this.currentGrid.owner.owner;
            wm.forEachProperty(p.subpageProplist, dojo.hitch(this, function(propertyPath, propertyName) {
                if (propertyPath == this.currentGrid.name + ".columns") {
                    p.setProp(propertyName, inColumns);
                }
            }));
        }
    },
    onTitleChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            this.changeItem("title", inDataValue);
        }
    },
    onWidthChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            var displayValue = this.widthSizeEditor.getDisplayValue();
            var w;
            if (displayValue.indexOf("p") != -1 || displayValue.indexOf("%") != -1) {
                w = displayValue;
                this.widthSizeEditor.setDataValue(parseInt(displayValue));
                this.widthTypeEditor.setDataValue(displayValue.indexOf("p") != -1 ? "px" : "%");
            } else {
                w = displayValue + (this.widthTypeEditor.getDataValue() || "%");
            }
            this.changeItem("width", w);
        }
    },
    onAlignChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            this.changeItem("align", inDataValue);
        }
    },

    onFormatChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            var isCustom = false;
            if (inDataValue == "- Add Formatter") {
                inDataValue = wm.getValidJsName(this.currentGrid.name + wm.getValidJsName(wm.capitalize(this.grid.selectedItem.getValue("field"))) + 'Format');
                isCustom = true;
            }
            if (this.changeItem("formatFunc", inDataValue)) {
                var row = this.grid.getSelectedIndex();
                var item = this.columnsVar.getItem(row);
                var formatProps = item.getValue("formatProps");
                formatProps.beginUpdate();
                formatProps.clearData();
                formatProps.endUpdate();
                formatProps = this.form.dataSet.getValue("formatProps");
                formatProps.beginUpdate();
                formatProps.clearData();
                formatProps.endUpdate();
                this.formatSubForm.setDataSet(formatProps);
            }
        }
        switch (inDataValue) {
        case "wm_currency_formatter":
            this.currencyLayer.activate();
            break;
        case "wm_number_formatter":
            this.numberLayer.activate();
            break;
        case "wm_image_formatter":
            this.imageLayer.activate();
            break;

        case "wm_button_formatter":
            this.buttonLayer.activate();
            break;
        case "wm_link_formatter":
            this.linkLayer.activate();
            break;
        case "wm_array_formatter":
            this.arrayLayer.activate();
            break;
        case "wm_date_formatter":
            this.dateLayer.activate();
            if (!this.dateFormatLength.getDataValue()) this.dateFormatLength.setDataValue("short");
            break;
        default:
            this.formatBlankLayer.activate();
            if (isCustom) {
                eventEdit(this.currentGrid, "_formatterSignature", inDataValue, true);
                this.owner.owner.hide();
            }

        }
    },
    onEditFieldChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            if (this.changeItem("fieldType", inDataValue)) {
                var row = this.grid.getSelectedIndex();
                var item = this.columnsVar.getItem(row);

                var editorProps = item.getValue("editorProps");
                editorProps.beginUpdate();
                editorProps.clearData();
                editorProps.endUpdate();
                editorProps = this.form.dataSet.getValue("editorProps");
                editorProps.beginUpdate();
                editorProps.clearData();
                editorProps.endUpdate();

                var constraints = item.getValue("constraints");
                constraints.beginUpdate();
                constraints.clearData();
                constraints.endUpdate();
                constraints = this.form.dataSet.getValue("constraints");
                constraints.beginUpdate();
                constraints.clearData();
                constraints.endUpdate();
                this.editorSelectLayerSubForm.setDataSet(editorProps);
                this.editorComboBoxLayerSubForm.setDataSet(editorProps);
                this.editorNumberLayerSubForm.setDataSet(constraints);
                this.editorDateLayerSubForm.setDataSet(constraints);
                this.editorTextLayerSubForm.setDataSet(editorProps);
            }
        }
        switch (inDataValue) {
        case "dojox.grid.cells._Widget":
            this.editorTextLayer.activate();
            break;
        case "dojox.grid.cells.NumberTextBox":
            this.editorNumberLayer.activate();
            break;
        case "dojox.grid.cells.DateTextBox":
            this.editorDateLayer.activate();
            break;
        case "dojox.grid.cells.TimeTextBox":
            this.editorTimeLayer.activate();
            break;
        case "dojox.grid.cells.Checkbox":
            this.editorCheckboxLayer.activate();
            break;
        case "dojox.grid.cells.ComboBox":
            this.editorComboBoxLayer.activate();
            this.onDataSetChange(this.dataSetComboBoxEditor, this.grid.selectedItem.getValue("editorProps.selectDataSet"), this.grid.selectedItem.getValue("editorProps.selectDataSet"), true);
            break;
        case "dojox.grid.cells.Select":
            this.editorSelectLayer.activate();
            break;

        default:
            this.editorPropBlankLayer.activate();

        }
    },
    onDisplayExprChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            this.changeItem("expression", inDataValue);
        }
    },
    onBackExprChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            this.changeItem("backgroundColor", inDataValue);
        }
    },
    onColorExprChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("textColor", inDataValue);
       }
   },
    onCancelClick: function() {
       this.currentGrid.set_columns(this.initialColumns);
       this.owner.owner.hide();
   },
   onOkClick: function() {
       this.owner.owner.hide();
   },
   onCellEdited: function(inSender, inValue, rowId, fieldId) {
       this.updateGrid(rowId);
   },


    /* Currency Formatter Changes */
   onCurrencyTypeChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.currency", inDataValue);
       }
   },
   onCurrencyDijitsChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.dijits", inDataValue);
       }
   },
   onCurrencyRoundChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.round", inDataValue);
       }
   },
   onDateLengthChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.formatLength", inDataValue);
       }
   },
   onDatePatternChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.datePattern", inDataValue);
       }
   },
   onTimePatternChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.timePattern", inDataValue);
       }
   },
   onUseLocalTimeChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.useLocalTime", inDataValue);
       }
   },
   onDateTimeChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.dateType", inDataValue);
       }
   },

   onNumberTypeChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.numberType", inDataValue);
       }
   },
   onNumberDijitsChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.dijits", inDataValue);
       }
   },
   onNumberRoundChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.round", inDataValue);
       }
   },
   onLinkPrefixChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.prefix", inDataValue);
       }
   },
   onLinkPostfixChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.postfix", inDataValue);
       }
   },
   onTargetChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.target", inDataValue);
       }
   },
   onImageWidthChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.width", inDataValue);
       }
   },
   onImageHeightChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.height", inDataValue);
       }
   },
    onArraySeparatorChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.separator", inDataValue);
       }
   },
    onArrayFieldNameChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.joinFieldName", inDataValue);
       }
   },
   onButtonClassChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("formatProps.buttonclass", inDataValue);
       }
   },
   onRegexChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("editorProps.regExp", inDataValue);
       }
   },
   onRequiredChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("editorProps.required", inDataValue);
       }
   },
   onInvalidChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("editorProps.invalidMessage", inDataValue);
       }
   },
   onOptionsChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
       if (!inSetByCode) {
           this.changeItem("editorProps.options", inDataValue);
       }
   },
    onDataSetChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        if (!inSetByCode) {
            this.changeItem("editorProps.selectDataSet", inDataValue);
        }
        var c = studio.page.getValueById(inDataValue);
        var options = [];
        if (c) var type = wm.typeManager.getType(c.type);
        if (type) {
            var fields = type.fields;
        }
        if (fields) {
            for (var fieldName in fields) {
                var fieldDef = fields[fieldName];
                if (!wm.typeManager.isStructuredType(fieldDef.type)) options.push(fieldName);
            }
        }
        this.comboBoxDisplayFieldEditor.setOptions(options.join(","));

    },
    onDisplayFieldChange:function(inSender, inDisplayValue, inDataValue, inSetByCode) {
    if (!inSetByCode) {
        this.changeItem("editorProps.displayField", inDataValue);
    }
    },
    onIsSimpleTypeChange:function(inSender, inDisplayValue, inDataValue, inSetByCode) {
        this.updateRestrictValues();
        if (!inSetByCode) {
           this.changeItem("editorProps.isSimpleType", inSender.getChecked());
        }
    },
    onIsRestrictValuesChange:function(inSender, inDisplayValue, inDataValue, inSetByCode) {
    if (!inSetByCode) {
        this.changeItem("editorProps.restrictValues", inSender.getChecked());
    }
    },
    updateRestrictValues: function() {
        var isSimple = this.isSimpleDataValueEditor.getChecked();
        this.isRestrictDataValueEditor.setDisabled(!isSimple);
        var restrictValues = this.grid.selectedItem.getValue("editorProps.restrictValues");

        /* onidle needed because this can be fired in the middle of processing checking a show checkbox */
        wm.onidle(this, function() {
            this.isRestrictDataValueEditor.setChecked(restrictValues === undefined || restrictValues);
        });
    },
    onMaximumChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
    if (!inSetByCode) {
        this.changeItem("constraints.max", inDataValue);
    }
    },
    onMinimumChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
    if (!inSetByCode) {
        this.changeItem("constraints.min", inDataValue);
    }
    },
    onCustomCssClassChange: function(inSender, inDisplayValue, inDataValue, inSetByCode) {
    if (!inSetByCode) {
        this.changeItem("cssClass", inDataValue);
    }
    },
    onRenderData: function() {
    this.grid.dojoObj.canSort = function() {return false;}
    },
  _end: 0
});