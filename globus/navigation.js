
// FACETED SEARCH
	function display_facets(){
		$(".all_facets").children().remove();
		
		var user_annotations_callback = function (annotations){
			var display_facets_callback = function(facets){
				if (facets!= null){
					$.each(facets[0], function(key, value){
						if (($.inArray(key, ignore_facets) < 0) && value != null){
							add_facet($(".all_facets"), key, value);
						}
					});
				}
			}
			var annotation_names = [];
			$.each(annotations, function(key, value){
				annotation_names.push(value["name"]);
			});
			// remove the system annotations
			annotation_names = $.except(annotation_names, ignore_facets);

			ds_get_facets(get_selected_catalog(), annotation_names, get_current_escaped_search(), display_facets_callback);
		}
	
		ds_get_annotation_definitions(get_selected_catalog(),user_annotations_callback,null);
	}
	

	function add_facet(parent, tag_name, values){
		var facet_list = $("<div>", {class: 'facet_list'});	
		var facet_title = $("<div>", {class: 'facet_title', text : tag_name});	
		facet_title.click(function(){
			$(this).parent().children(".facet_contents").toggle();
			$(this).toggleClass('facet_close');
			$(this).toggleClass('facet_open');
		});
		
		var facet_contents = $("<div>", {class: 'facet_contents'});

		if ($.inArray(tag_name, get_searched_tags()) > -1 ){	// if this is in the current search terms leave it open
			facet_contents.show();
			facet_title.addClass('facet_close');
		} else {
			facet_title.addClass('facet_open');
		}
		
		facet_contents.append(create_facet_checkbox(tag_name, null,":absent:"));
		facet_contents.append(create_facet_checkbox(tag_name, null, null));

		$.each(values, function(index, value){
			facet_contents.append(create_facet_checkbox(tag_name, value))
		});
		
		facet_list.append(facet_title).append(facet_contents);
		parent.append(facet_list);
	}
	
	function create_facet_checkbox(tag_name, value, operator){
		var facet_container = $("<div>");
		
		var current_search = get_current_search();
		var search_string = tag_name+ "=" + value;
		var text_label = value;
		var already_in_search = false;
				
		if (operator != null){
			search_string = tag_name + operator;
			text_label = tag_name + " not present";
		}
		if (value== null && operator == null){
			search_string = tag_name;
			text_label = tag_name + " present";
		}
		
		if ($.inArray(search_string, current_search) > -1){
			already_in_search = true;
		}
		
		var facet_checkbox = $("<input>", {type: 'checkbox', 
							class: 'facet_checkbox', value: search_string});
		if (already_in_search){
			facet_checkbox.attr('checked','checked');
		}
		facet_checkbox.change(function(){
			if ($(this).is(":checked")){
				add_facet_to_query(search_string);
			} else {
				remove_facet_from_query(search_string);
			}
			//update_search_query();
		});
		var facet_label = $("<label>", {text: text_label});
		facet_container.append(facet_checkbox).append(facet_label);
		return facet_container;
	}