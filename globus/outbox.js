 
//outbox_ingest('kyle', '/~/gwdemo');

function outbox_ingest(dataset_id, catalog_name, username, root, callback){
	var results = null;
	var headers = { "Content-Type": "application/json",  "Accept": "application/json" };
	var data = {"dataset_id": dataset_id, "catalog_name" : catalog_name, "root": root,  "username": username};
			//"tagfiler_url": "https://localhost/tagfiler" }
	
	// TODO - hack to add /~ at the begining.
	if (root.indexOf('~') === -1){
		data['root'] = '/~' + root;
	}
	
	$.ajax({
		async: (callback != null),
		type: "POST",
		headers: headers,
		data: JSON.stringify(data),
		datatype: 'json',
		url: '/outbox',
		error: function(xhr, status, error) {
			if (debug_alerts) {
				if (callback){
					callback(false, ' (' + status + ', ' + error + ')');
				}else{
					alert('ERROR Calling Outbox '  + ' (' + status + ', ' + error + ')');
				}
			}
		},
		success: function(json) {
			/* { "code": "ERROR or OK",
				 "reason": "error text if code is ERROR",
				 "output": "output from outbox if code is OK" }*/
			if (callback){
				callback((json['code'] == 'OK'), json['reason']);
			}
			results = json;
		}
	});
	return results;
}
