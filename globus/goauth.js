// requires jquery.cookie plugin
$.ajaxPrefilter(function(options,originalOptions,jqXHR) {
    token = GOAuthToken;//$.cookie("globusonline-goauth");
    if (token) {
        //jqXHR.setRequestHeader("Authorization",
          //                     "Globus-Goauthtoken " + token);
    }
});
