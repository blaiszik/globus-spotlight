function export_dataset(){
		var id = get_checked_datasets();	
		if (id.length != 1){
			alert("Can only export 1 dataset at a time.");
			return;
		}
		$('#modal_export_dataset').reveal({
			animation: 'fade',                   //fade, fadeAndPop, none
		});
		$('#modal_export_dataset').focus();
	}
function compare_datasets(){
		var ids = get_checked_datasets();
		var current_url = window.location.toString().replace(/\?.#*/, "")
		window.location.replace(current_url+ "/compare.html?ids="+ids);
	}
	
	function transfer_dataset(){
		var id = get_checked_datasets();	
		if (id.length != 1){
			alert("Can only transfer 1 dataset at a time.");
			return;
		}

		// not ideal but get the current URL to use for the redirect
		var current_url = window.location.toString().replace(/\?.*/, "")
		//alert("'"+ current_url + "'");
		window.location.replace(globus_selection_url + "?type=transfer_callback&id=" + id + "&action=" + encodeURIComponent(current_url));
	}
	
	function share_dataset(){
		var id = get_checked_datasets();
		
		if (id.length != 1){
			alert("Can only share 1 dataset at a time.");
			return;
		}
		
		show_sharing_popup(id[0], null);
	}
	
	// called when the GO picker page returns the transfer destiniation
	function transfer_callback(){
		var id = getParameterByName('id');
		var dest_endpoint = getParameterByName('endpoint');
		var dest_path = getParameterByName('path');
		
		var source_endpoint = "";
	 	var files = {};
		var dataset_files = tf_get_files_for_dataset(get_selected_catalog(), id);
			$.each(dataset_files, function(key, value){
				source_endpoint = value['endpoint'][0];
				if (value['file_name']!= null){
					temp = value['file_path'];
					if (value['file_path'] instanceof Array){
						temp = value['file_path'][0];
					}
					files[temp + value['file_name']] = {'source_path': temp + value['file_name'], 'destination_path':  dest_path + value['file_name'], 'directory': false};
				} else {
					files[value['directory_path'] + value['directory_name']] = {'source_path': value['directory_path'] + value['directory_name'], 'destination_path':  dest_path + value['directory_name'], 'directory' : true};
				}
			});
	
		
		var transfer_submitted_callback = function(json){
			var message = "Transfer started to " + dest_endpoint + dest_path + " with submission id " + json['task_id']; 
			var current_url = window.location.toString().replace(/\?.*/, "")
			window.location.replace(current_url+ "?type=transfer_finished&id=" + encodeURIComponent(json['task_id']) + "&dest_endpoint=" + encodeURIComponent(dest_endpoint) + "&dest_path=" + encodeURIComponent(dest_path));
		}
		
		go_transfer_file(source_endpoint, dest_endpoint, files, "Catalog transfer of Dataset " + id, transfer_submitted_callback)
	}
	
	function show_transfer_message(id, dest_endpoint, dest_path){
		var message_div = $("<div>", {class: "feedback_div success_feedback"});
		var span = $("<span>", {text: "Transfer to  " + dest_endpoint+ dest_path + " started with submission ID "});
		var link = $("<a>", {href: globus_status_url + '?id=' + id, text: id});
		message_div.append(span).append(link).append($("<span>", {class: "close_feedback_div", text: "X"}));
		$("#user_feedback_div").append(message_div);
		$("#user_feedback_div").show();
	}