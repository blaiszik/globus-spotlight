
var transfer_base = "/service/transfer";
var debug_alerts = 1;

function go_create_share(endpoint, path, share_name){
	go_auto_activate(endpoint);
	var data = {"DATA_TYPE":"shared_endpoint",
			"host_endpoint":endpoint,
			"host_path":path,
			"name":share_name,"description":""};
	var result = go_tapi('POST', '/shared_endpoint', data,
						 'creating shared endpoint');
	return result['canonical_name'];
}

function go_get_sharing_acls(shared_endpoint){
	var resource = '/endpoint/' + encodeURIComponent(shared_endpoint)
				 + '/access_list';
	var results = go_tapi('GET', resource, null, 'getting access rules');
	return results;
}

function go_add_sharing_acl(shared_endpoint, user, path, permissions){
	var data = {"principal_type": "user",
				"path": path,
				"principal": user,
				"permissions": permissions,
				"DATA_TYPE": "access"};
	var resource = '/endpoint/'
				   + encodeURIComponent(shared_endpoint) + "/access";
	var result = go_tapi('POST', resource, data, 'add acl');
	return result
}

function get_submission_id(){
	return go_tapi('GET', '/submission_id', null, 'getting submission id');
}

function go_transfer_file(ep1, ep2, files, label, callback){
	go_auto_activate(ep1);
	go_auto_activate(ep2);
	var file_data = go_create_transfer(files);
	var submission_id = get_submission_id()['value'];
	var submission_data = {
			"submission_id": submission_id, 
			"DATA_TYPE": "transfer", 
			"sync_level": null, 
			"source_endpoint": ep1, 
			"label": label, 
			"length": file_data.length, 
			"destination_endpoint": ep2, 
			"DATA": file_data}
	
	var result = go_tapi('POST', '/transfer',
						 submission_data, "submitting transfer", callback);
	
}

function go_create_transfer(files){
	var transfer_files = [];
	$.each(files, function(name, value){
		transfer_files.push({
		      "source_path": value['source_path'], 
		      "destination_path": value['destination_path'], 
		      "verify_size": null, 
		      "recursive": value['directory'], 
		      "DATA_TYPE": "transfer_item"
		    })
	});
	return transfer_files;
}

function go_get_endpoint_names(){
	var data = go_list_endpoints('canonical_name');
	var eps = [];
	for (var i=0; i < data['DATA'].length; i++) {
		eps.push(data['DATA'][i]['canonical_name']);
	}
	return eps;
}

function go_list_endpoints(fields){
	var resource = '/endpoint_list?fields=' + fields;
	return go_tapi('GET', resource, null, 'listing endpoints');
}


function go_get_endpoint_ls(endpoint, path, message_callback){
	if (go_auto_activate(endpoint, message_callback) == null){
		return;
	}
	if (path == null) {
		path = '';
	} else {
		path = encodeURIComponent(path);
	}
	var resource = '/endpoint/' + encodeURIComponent(endpoint) + '/ls?show_hidden=false&path=' + path;
	return go_tapi('GET', resource, null, 'Getting ls');
}


function go_auto_activate(endpoint,message_callback){
	var resource = '/endpoint/' + encodeURIComponent(endpoint)
			     + '/autoactivate?if_expires_in=600';
	
	var result = go_tapi('POST', resource, null, 'auto activating');
	if (result["code" ] == "AutoActivationFailed" && message_callback != null){
		var activate_url = globus_activate_url+ "?ep=" + encodeURIComponent(endpoint);
		message_callback("Error activating endpoint. "  +
				"To activate the endpoint go to: <a href=\"" + activate_url + "\">"+ activate_url + "</a>", "error");
		return null;
	}
	return result;
}

function go_tapi(method, resource, data, error_prefix, callback){
	var results = null;
	var headers = { "Content-Type": "application/json",
				    "Accept": "application/json" };
	$.ajax({
		async: (callback != null),
		type: method,
		headers: headers,
		data: JSON.stringify(data),
		datatype: 'json',
		url: transfer_base + resource,
		error: function(xhr, status, error) {
			if (debug_alerts) {
				alert('ERROR ' + error_prefix
					  + ' (' + status + ', ' + error + ')');
			}
		},
		success: function(json) {
			if (callback){
				callback(json);
			}
			results = json;
		}
	});
	return results;
}
