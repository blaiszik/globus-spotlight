
(function($){
	var TagEditor = function(element, options)  {
		var elem = $(element);
		var obj = this;
		
		
		var tag_editor_container =null;
		var tags_pane = null;
		var dataset = null;	
		var tags_changed_callback = null; // callback function when files are added...
		var message_handler_callback = null;	// message handler function to display success/errors to users
		var dataset_id = null;
		var catalog_id = null;
		var te_logged_in_user = null;
		var can_edit = false;
		var members = null;
		var members_tab = false;
		var member_select = null;
		var dataset_owner = null;
		
		// Merge options with defaults
		var settings = $.extend({
			param: 'defaultValue'
		}, options || {});

		
		this.reset = function(){
			/*dataset_files = {};
			dataset_selected_files.children().remove();
			selector_pane.children().remove();
			path_input.val(""); 
			endpoint_select.val(null);*/
		};
		
		this.add_tags_changed_callback = function(callback){
			tags_changed_callback = callback;
		};
		
		
		this.add_message_callback = function(callback){
			message_handler_callback = callback;
		};
		
		this.set_dataset_id = function(id){
			dataset_id = id;
		};
		
		this.set_catalog_id = function(cat_id){
			catalog_id = cat_id;
		};
		
		this.set_dataset = function(ds){
			dataset = ds;
		};
		this.set_dataset_owner = function(owner){
			dataset_owner = owner;
		};
		
		this.set_logged_in_user = function(le){
			te_logged_in_user = le;
		};
		
		this.set_members_tab = function(mt){
			members_tab = mt;
		};
		
		this.set_members = function(m){
			members = m;
		};
		
		// called by file selector when list is updated
		this.update_member_list = function(){
			
			var update_members = function(json){
				members = json;
				generate_member_changer();
			}
			ds_get_members(catalog_id, dataset_id, null, update_members, null);
		}
		
		/*
		 * Private Functions
		 * 
		 */
		var set_annotation = function(annotation_name, annotation_value, new_annotation_callback, error_callback){
			if (members_tab){
				ds_set_member_annotation(catalog_id, dataset_id, member_select.val(), annotation_name, annotation_value, new_annotation_callback, error_callback);
			}else {
				ds_set_annotation(catalog_id, dataset_id, annotation_name, annotation_value, new_annotation_callback,error_callback);
			}

		}
		var delete_annotation = function(tag_name, value){
			if (members_tab){
				return ds_delete_member_annotation(catalog_id, dataset_id, member_select.val(), tag_name, value, null);
			}else {
				return ds_delete_annotation(catalog_id, dataset_id, tag_name, value, null);
			}
		}
		
		var get_annotations = function(){
			var anns = null;
			if (members_tab){
				if (member_select.val() != null){
					anns =  ds_get_all_member_annotations(catalog_id, dataset_id, member_select.val(), null, null);
				}
			} else {
				anns = ds_get_full_dataset_info(catalog_id, dataset_id, null, null);
			}
			if (anns != null){
				return anns[0];
			}
			return anns;
		}
		
		
		var message_callback = function(message, type){
			
			if (message_handler_callback != null){
				message_handler_callback(dataset_id, message, type);
			}
		}
		
		
		// control panel for the file selector
		var generate_multi_tag = function(name, value){
			var multi_name = $("<span>", {text: value, class: "multi_tag_name"});
			var multi_tag =  ($("<div>", {class: "multi_tag_wrapper"})).append(multi_name);
			return multi_tag;
		}
		
		var make_row_editable = function(row){
			var tag_name = row.children('label').text();
			var tag_values = [];

			var text_area = row.children('.tags_textarea')
			var tag_wrappers = text_area.children('.multi_tag_wrapper');
			
			if (tag_wrappers.children().length == 0){
				text_area.append($("<input>", {class: "tags_edit", type: "text"}));
				text_area.removeAttr('style'); // remove the hardcoded cell height if there was no value
				tag_values = null;
			}
			tag_wrappers.children().each(function (){
				tag_values.push($(this).text());
				var div = ($("<div>", {class: "edit_tag_row"}));
				div.append($("<input>", {class: "tags_edit", type: "text", value: $(this).text()}));
				var delete_img =  ($("<img>", {class: "tags_edit_delete", src: "icons/delete.png"}));
				// just remove the cell - if users save the deletion will be caught
				delete_img.click(function(){
					$(this).parent().remove();
				});
				div.append(delete_img);
				text_area.append(div);
			});
			
			// have to remove and add classes to change the div size to fit the delete icon and remove the border
			text_area.removeClass('tags_textarea_display');
			text_area.addClass('tags_textarea_edit')
			
			var save_tag = $("<button>", {class: "tags_add_button", text: "Save"});
			var cancel_tag = $("<button>", {class: "tags_add_button", text: "Cancel"});
			
			cancel_tag.click(function(){
				row.children().remove();
				generate_tag_row(tag_name, tag_values, row);
			});
			
			// TODO - this is not dataset_ideal.. we delete all tag values and then recreated new ones
			// would be better to just edit the existing ones
			save_tag.click(function(){
				row.children().remove();
				var new_tag_vals = [];
				$(this).parent().find('input').each(function (){
					new_tag_vals.push($(this).val());
				});
				
				row.children().remove();
				generate_tag_row(tag_name, new_tag_vals, row);
				
				// TODO terrible way to do this, but we will delete all tags that have changed
				$.each(tag_values, function(key, value){
					if ($.inArray(value, new_tag_vals) < 0 ){
						delete_annotation(tag_name, value, null);
					} 
				});
				
				// work out which values have changed
				var changed_vals = [];
				$.each(new_tag_vals, function(key, value){
					if ($.inArray(value, tag_values) < 0 ){
						changed_vals.push(value);
					} 
				});
				if (changed_vals.length > 0){
					set_annotation(tag_name, changed_vals);
				}
			});
			
			text_area.append(save_tag).append(cancel_tag)
			
			tag_wrappers.remove();
			row.children('img').remove();
			row.children('img').remove();
		}
		
		var generate_tag_row = function(name, value, tag_div){

			var multi_tag_label =  ($("<label>", {text: name}));
			var multi_tag_input =  ($("<div>", {class: "right_tags tags_textarea tags_textarea_display"}));
			if (value instanceof Array){
				$.each(value, function(mtag_index, mtag_name ){
					multi_tag_input.append( generate_multi_tag(name, mtag_name));
				});
			} else {
				if (value != null){
					multi_tag_input.append( generate_multi_tag(name, value));
				} else {
					multi_tag_input.attr("style", "height:18px;");
				}
			}
			var pencil_img =  ($("<img>", {class: "right_image", src: "icons/pencil.png"}));
			pencil_img.click(function(i) {
				return function() {
					make_row_editable($(this).parent());
				};
			}(dataset_id));
			
			tag_div.append(multi_tag_label).append(multi_tag_input);
			
			if (can_edit){
				tag_div.append(pencil_img);
			}
		}
		
		var generate_tag = function(name, value){
			var tag_div = ($("<div>", {class: "tag_div tag_name_" + name}));
			generate_tag_row(name, value, tag_div);
			return tag_div;
		}
		
			
		var generate_add_tag = function(){
			// tag input
			var tag_div = ($("<div>", {class: "tag_div"}));
			
			if (!can_edit){
				message_callback("You do not have permission to add new tags to this dataset.", "error");
			}
			
			var new_tag_label =  ($("<input>", {class: "left_tags input_left new_tag_name", type: "text", placeholder: "enter tag name"}));
			var new_tag_input =  ($("<input>", {class: "right_tags tags_input_val", type: "text", placeholder: "enter tag value"}));
			
			var additional_tag_info = ($("<div>", {class: "additional_tag_info", style: "display: none"}));
			var new_tag_spacer =  ($("<div>", {class: "left_tags left_spacer"}));
			new_tag_spacer.append($("<span>", {text: "Multivalue"}));
			new_tag_spacer.append($("<input>", {type: "checkbox", class: 'new_tag_multi_checkbox'}));
			var new_tag_type =  ($("<select>", {class: "right_tags tags_half_left new_tag_type_select"}));
			var new_tag_multi = ($("<div>", {class: "right_tags tags_half_right"}));
			additional_tag_info.append(new_tag_spacer).append(new_tag_type).append(new_tag_multi);
			
			var submit_tag_info = ($("<div>", {class: "submit_tag_info"}));
			var submit_add_button =  ($("<button>", {text: "Add Tag", class: "right_tags tags_button"}));
			if (!can_edit){
				submit_add_button.attr("disabled", "disabled");
			}
			var submit_cancel_button =  ($("<button>", {text: "Cancel", class: "right_tags tags_button"}));
			submit_tag_info.append(submit_add_button).append(submit_cancel_button);

			$.each(ds_get_annotation_type_list(), function(key, value){
				new_tag_type.append($("<option>", {value: key, text: value}));
			});
			
			function changed_tag_label(label_element){
				if (ds_get_annotation_definition(catalog_id, label_element.val(), null, null) != null){
					label_element.parent().children(".additional_tag_info").hide();
	        	} else {
	        		label_element.parent().children(".additional_tag_info").show();
	            }    
			}
			
			// get all the annotations avaialble to this user to populate the autocomplete
			var initialize_autocomplete_callback = function(annotations){
				var annotation_names = $.map(annotations, function(element) { return $(element).attr('name'); });
				new_tag_label.autocomplete({
					    source : annotation_names, 	
						wdataset_idth: 178, 
						select: function(value, data){ 
							changed_tag_label($(this));
						}
				});
			}
			
			ds_get_annotation_definitions(catalog_id, initialize_autocomplete_callback, null)
			
			new_tag_label.blur(function(){
		        changed_tag_label($(this));
			});
				
			submit_cancel_button.click(function(){
				var label = $(this).parent().parent().children('.input_left')
				label.val(label.attr("rel"));
		    	$(this).parent().parent().children('.tags_input_val').val("");
		    	$(this).parent().parent().children(".additional_tag_info").hide();
			});
			
			if (can_edit){
				submit_add_button.click(function(){
				    	  var name = $(this).parent().parent().children('.input_left').val();
				    	  var val_in = $(this).parent().parent().children('.tags_input_val').val();
		
				    	  var type = $(this).parent().parent().find('.new_tag_type_select').val();
				    	  var multi = $(this).parent().parent().find('.new_tag_multi_checkbox').is(':checked');
				    	  if (multi){
				    		  var val = val_in.split(',');
						  }else {
							  var val = val_in
						  }
				    	  //var feedback_area = $("." + dataset_id +"_tags_pane").find(".tag_creation_feedback");
				    	  message_callback("Creating tag " + name + ": " + val, "info");
				    	
				    	  var new_tag_callback = function(result){
				    		  message_callback("Tag Created", "success");
					    	  refresh_tags(false);
				    	  };
				    	  
				    	  // if the tag doesnt already exist it will be created.
				    	  add_new_annotatation(name, val, type, multi, new_tag_callback);
				       });
			}
			tag_div.append(new_tag_label).append(new_tag_input).append(additional_tag_info).append(submit_tag_info);

			return tag_div;
		}
		
		// work out if we need to create a new definition, and add tag value
		var add_new_annotatation = function(annotation_name, annotation_value, annotation_type, multi, new_annotation_callback){
			if (ds_get_annotation_definition(catalog_id, annotation_name, null, null) == null){
				ds_create_annotation_definition(catalog_id, annotation_name, annotation_type, multi);
			}
			
			set_annotation(annotation_name, annotation_value, new_annotation_callback, null);
		}
		
		
		// called when new tags are added..
		var refresh_tags = function(show){
			//var dataset_tags_pane = $("." + dataset_id +"_tags_pane");
	  	  	tags_pane.children(".tags_edit").remove();
	  	    //tags_pane.children(".tags_add").hide();
	  	  	var new_edit = generate_tags_edit(true);
	  	  	if (!show){
	  	  		new_edit.attr("style", "display:none;");
	  	  	}
	  	  	
	  	  	tags_pane.append(new_edit);
	  	  	if (tags_changed_callback != null){
	  	  		tags_changed_callback();
	  	  	}
		}
		
		var change_member = function(){
			tags_pane.children(".tags_edit").remove();
	  	    tags_pane.children(".tags_add").hide();
	  	  	tags_pane.append(generate_tags_edit(true));
	  	    tags_pane.find(".edit_tags_link").removeClass('link tag_header_selected');
	  	    tags_pane.find(".add_tags_link").addClass('link tag_header_selected');	
	  	    tags_pane.find(".edit_tags_link").addClass('tag_header_selected');
	  	    tags_pane.find(".add_tags_link").removeClass('tag_header_selected');	
		}
		
		var generate_tags_edit = function(refresh){
			var annotations = null;
			if (refresh == true){
				annotations = get_annotations();
			} else 	if (!members_tab && dataset != null){
				annotations = dataset;
			} else if (members_tab){
				annotations = get_annotations();
			}
			var tags_edit = ($("<div>", {class: 'tags_edit tags_layout'}));
			// check if the current user is the owner or explicitly in the write users list and therefore able to edit tags
			if (annotations != null){
				$.each(annotations['annotations_present'], function(tag_index, tag_name ){
					if ($.inArray(tag_name, ignore_facets) < 0 && $.inArray(tag_name, tags_dont_show) < 0 ){
						tags_edit.append(generate_tag(tag_name, annotations[tag_name]));
					}
				});		
			}
			return tags_edit;
		}
		
		
		var generate_tags_tab_content = function(){
			var user_acls = ds_get_user_acls(catalog_id, dataset_id, format_user(te_logged_in_user));
			can_edit = ((user_acls != null && user_acls["permission"].indexOf("w") > -1) || dataset_owner == te_logged_in_user);
			tags_pane = ($("<div>", {class: 'tags_pane ' + dataset_id +"_tags_pane"}));

			var tags_header = ($("<div>", {class: 'tags_header'}));
			var edit_tags_header = ($("<span>", {class: 'edit_tags edit_tags_link tag_header_selected', text: 'Edit Tags '}));
			var space_tags = ($("<span>", {class: 'space_tags', text: '  |  '}));
			var add_tags_header = ($("<span>", {class: 'add_tags add_tags_link link', text: 'Add Tags '}));
					
			var tags_add = ($("<div>", {class: 'tags_add tags_layout', style: "display:none;"}));
			tags_add.append(generate_add_tag());
			var tags_edit = generate_tags_edit();
			
			edit_tags_header.click(function(){
				$(this).closest(".tags_pane").children(".tags_edit").show();
				$(this).closest(".tags_pane").children(".tags_add").hide();
				edit_tags_header.removeClass('link tag_header_selected');
				add_tags_header.addClass('link tag_header_selected');	
				edit_tags_header.addClass('tag_header_selected');
				add_tags_header.removeClass('tag_header_selected');	
			});
			add_tags_header.click(function(){
				$(this).closest(".tags_pane").children(".tags_edit").hide();
				$(this).closest(".tags_pane").children(".tags_add").show();
				edit_tags_header.addClass('link tag_header_selected');
				add_tags_header.removeClass('link tag_header_selected');
				edit_tags_header.removeClass('tag_header_selected');
				add_tags_header.addClass('tag_header_selected');	
				
				// remove any previous user messages
				//$(this).closest(".tags_pane").find(".tag_creation_feedback").children().remove();
			});
			
			tags_header.append(edit_tags_header).append(space_tags).append(add_tags_header);
			tags_pane.append(tags_header).append(tags_add).append(tags_edit);

			return tags_pane;
		}
		
		// only used on the member view
		var generate_member_changer = function(){	
			tag_changer_div.children().remove();
			member_select =  ($("<select>", {class: "tag_changer"}));

			if (members != null){
				$.each(members, function(key, value){
					member_select.append( ($("<option>", {text: value["data_uri"],value: value["id"]})));	
				});
			}
			member_select.change(function(){
				change_member();
			});
			tag_changer_div.append(member_select);
		}
	
		this.display = function(){
			if (members_tab){
				tag_changer_div = ($("<div>", {class: "tag_changer_div"}));
				generate_member_changer();
				tag_editor_container.append(tag_changer_div);
			}
			tag_editor_container.append(generate_tags_tab_content());
		};

		var create_tag_editor = function(){
			tag_editor_container =  ($("<div>", {class: "tag_editor_container"}));
			return tag_editor_container;
		}

		// Main constructor code
		elem.append(create_tag_editor());

	};

	$.fn.tag_editor = function(options){
		// returning this.each allows multiple to be stringed together.
		return this.each(function() {
			var element = $(this);

			// Return early if this element already has a plugin instance
			if (element.data('tag_editor')) return;

			// pass options to plugin constructor
			var myplugin = new TagEditor(this, options);

			// Store plugin object in this element's data
			element.data('tag_editor', myplugin);
		});
	};

})(jQuery);
