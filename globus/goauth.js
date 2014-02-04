// requires jquery.cookie plugin
$.ajaxPrefilter(function(options,originalOptions,jqXHR) {
    token = $.cookie("globusonline-goauth");
    console.log(options);
    console.log(originalOptions);
    console.log(jqXHR);
    if (token) {
        jqXHR.setRequestHeader("Authorization",
                               "Globus-Goauthtoken " + token);
    }
});
