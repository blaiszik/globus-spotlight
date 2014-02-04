// requires jquery.cookie plugin
$.ajaxPrefilter(function(options,originalOptions,jqXHR) {
	es_url_length = es_url.length;
    token = $.cookie("globusonline-goauth");

    //Edited to only add tokens that are not sent to Elasticsearch
    if (token && !(options.url.slice(0,es_url_length) == es_url) ) {
    	console.log('adding headers');
        jqXHR.setRequestHeader("Authorization",
                               "Globus-Goauthtoken " + token);
    }else{
    	console.log('not adding headers');
    }
});
