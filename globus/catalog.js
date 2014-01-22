
	function parse_date(dateString){
		var regex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
		var date_array = regex.exec(dateString); 
		var date = new Date((date_array[1]), (date_array[2])-1, (date_array[3])-1, (date_array[4]), (date_array[5]), (date_array[6]));
		return date;
	}
	
	function format_date(date){
		  var d = parse_date(date);
		  function pad(n){return n<10 ? '0'+n : n}
		  return d.getUTCFullYear()+'-'+ pad(d.getUTCMonth() + 1) + "-"
		      + pad(d.getUTCDate());
		}
	
	function format_endpoints(endpoints){		
		if (endpoints == null || endpoints.length == 0){
			return "";
		} else if (endpoints.length == 1){
			return endpoints[0]; 
		}
		return "" + endpoints[0] + "... (" +  endpoints.length + " more)"; 
	}
	