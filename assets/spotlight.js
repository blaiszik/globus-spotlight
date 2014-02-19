result_set = {};
debug = '';
default_destination_path = "go#ep1/home/blaiszik"
default_destination_endpoint = "go#ep1";

function gs_load_events(){
    //Perform elasticsearch query for every keyup in the #input-search to give spotlight-style feel
    $('#input-search').keyup(function() {
          gs_perform_search();// get the current value of the input field.
    });

    $('#btn-start-transfer').click(function(){ 
        gs_perform_transfer();
        //Add transfer logic here
    });       


    //Bind the right click event of #input-search to clear the value
    $('#input-search').mousedown(function(event) {
    switch (event.which) {
        case 3:
            $('#input-search').val('');
            break;
        }
    });

    //Add a tag to a group of selected result-set-item(s). First, trim the updates of whitespace, and convert the contents to an array
    //Create the tag HTML and add it to the result-set-item div.  Get the unique Elasticsearch identifier by splitting the div ids
    //and finally perform the update of the item (need to add update permission checking)
    $('#btn-add-tag').click(function(){
      tag_array = $('#input-add-tag').val().trim().split(',');
      len = tag_array.length;      
      for (i = 0; i < len; i++){
          tag_array[i] = tag_array[i].trim();  
      }

      tag_html = "<label class='label label-primary'>" + tag_array.join("</label> <label class='label label-primary'>") + "</label>";

      $('.result-set-item-selected').each(function(index){
        this_id = $( this ).attr('id').split('-').slice(3).join('-');
        $('#result-set-tag-'+this_id).html(tag_html);
        gs_perform_update(this_id, tag_array);
      });
    });

    ////
    //JQuery logic to support selection of result-set-item(s). Currently support all, none, inverse selections
    $('#btn-select-all').on("click",function(){
      $('.result-set-item').addClass('result-set-item-selected');
      build_transfer_list();
    });

    $('#btn-select-none').click(function(){
      $('.result-set-item').removeClass('result-set-item-selected');
      build_transfer_list();
    });

    $('#btn-select-inverse').click(function(){
      $('.result-set-item').toggleClass('result-set-item-selected');
      build_transfer_list();
    });
    /////

    //End button click events 
}

//Function to load events for items that may be loaded AFTER the original gs_load_events() is called. 
//These are generally items created in the templating process which can be dynamic
function gs_load_live_events(){
  $('.result-set-item').click(function(){
        $(this).toggleClass('result-set-item-selected');
        build_transfer_list();
  });

  $('.label-last-modified').each(function( index ) {
      val = $('.label-last-modified')[index].innerText.trim();
      if(val){
              var d = new Date(val);
      }
      $('.label-last-modified')[index].innerText = d.toString();
  });
}

function gs_reset_panels(){
  $('#result-block').hide();
  $('#detail-block').hide();
}

//Elasticsearch update -- GET the original content and
function gs_perform_update(this_id, tag_list){
  $.ajax({
     type: 'GET',
     url: es_default_path+this_id,
     success: function(data) {
        the_id = data._id;
        source = data._source;
        source.tags = tag_list;
         $.ajax({
           type: 'PUT',
           async:false,
           url: es_default_path+this_id,
           data: JSON.stringify(source),
           success: function(data){
              gs_load_tag_list();
           }
         });
     }
   });
}

function gs_load_tag_list(){

  requestData = {
                    "query" : {
                        "match_all" : {}
                    },
                  "facets" : {
                        "tag" : {
                            "terms" : {
                                "field" : "tags",
                                "size" : 4
                            }
                        }
                    }
                };

 requestUrl = es_default_path + '_search';
 tagArr = [];
 $('#tag-group-bar').html('<label class="quick-tag font-white" style="color: #fff">Building Tag Group List...</label>');

  $.ajax({
     type: 'POST',
     url: requestUrl,
     data: JSON.stringify(requestData),
     success: function(data) {
      debug = data;
      //<label class='quick-tag font-white' style="color: #fff">Scattering</label> | 
      tag_groups = data.facets.tag.terms;

      for(i=0;i<tag_groups.length; i++){
        console.log(tag_groups[i]);
        tagArr.push("<label class='quick-tag font-white' style='color: #fff'>"+ tag_groups[i].term +"</label>");
      }
      $('#tag-group-bar').append(tagArr.join(' | '));
      //When a quick-tag is clicked, add the value to the current search
      $('.quick-tag').click(function(){
          val = $('#input-search').val()
          if(val){
            val = val + ' ' 
          }
          $('#input-search').val( val + $(this).text());
          gs_perform_search();
      });
     }
   });
}

function gs_perform_search(){
  if($('#input-search').val().trim() == ''){
    return;
  }

  $('#detail-block').show();
  $('#result-block').show();
  requestData = {
                  "size":result_size,
                  "query": {
                      "query_string" : {
                          "fields" : ["tags^3", "path^2", "name^2", "endpoint", "DATA_TYPE"],
                          "query" : $('#input-search').val()?$('#input-search').val():'*'
                    }
                  }
              };
  $.ajax({
     type: 'POST',
     url: es_default_path + '_search',
     data: JSON.stringify(requestData),
     success: function(data) {
         result_set = data.hits.hits;
         result_file_size = 0;

         for(i=0; i<result_set.length; i++){
              if(result_set[i]._source.size){
                result_file_size = result_file_size + result_set[i]._source.size;
              }
              if(result_set[i]._source.size > 0){
                  result_set[i]._source.size = fileSizeSI(result_set[i]._source.size);
              }else{
                  result_set[i]._source.size = '';
              }
          }
          new EJS({url:'./templates/search_result.ejs'}).update('ejs-search-result',data); 
          gs_load_live_events();
          result_file_size_html = "<b>"+data.hits.total+' results found | > '+fileSizeSI(result_file_size)+"</b>";
          $('#result-file-size').html(result_file_size_html);
     }
  });
}

function gs_perform_transfer(){
  files_to_transfer = {};
  destination_path = '';
  source_path = '';

  files_to_transfer = build_transfer_list();
  for(var ep in files_to_transfer){
    console.log(ep + ': ' + files_to_transfer[ep]);
    //go_transfer_file(ep,default_destination_endpoint, files_to_transfer[ep],function(){console.log('testing transfer');});
    for(trans in files_to_transfer[ep]){
      console.log(files_to_transfer[ep][trans]);
    } 
}

  console.log(files_to_transfer);

}


//Helper functions, mainly for formatting
function fileSizeSI(a,b,c,d,e){
    return (b=Math,c=b.log,d=1e3,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(2)
     +' '+(e?'kMGTPEZY'[--e]+'B':'B')
    //kB,MB,GB,TB,PB,EB,ZB,YB
    }

function build_transfer_list(){
  var files_to_transfer = {};

    //Scrape the ids of selected search result items
  $('.result-set-item-selected').each(function(index){
        this_id = $( this ).attr('id').split('-')[2];  
        //Create transfer arrays
        if(!files_to_transfer[result_set[this_id]._source.endpoint]){
          files_to_transfer[result_set[this_id]._source.endpoint] = [];
        }
        
        //Break down transfers into files and directories
        if(result_set[this_id]._source.type == 'file'){
          destination_path = default_destination_path+'/'+result_set[this_id]._source.file_name
          source_path = result_set[this_id]._source.endpoint+result_set[this_id]._source.path+'/'+result_set[this_id]._source.file_name;
        }else{
          destination_path = default_destination_path
          source_path = result_set[this_id]._source.endpoint+result_set[this_id]._source.path+result_set[this_id]._source.file_name;

        }

        //Create the transfer object
        transfer_object = {
                            "destination_path":destination_path,
                            "destination_endpoint":default_destination_endpoint,
                            "source_path":result_set[this_id]._source.endpoint+result_set[this_id]._source.path+'/'+result_set[this_id]._source.file_name,
                            "source_endpoint":result_set[this_id]._source.endpoint,
                            "type":result_set[this_id]._source.type
        };

        //Make sure the transfer isn't from-to the same path. If not, add to the files_to_transfer array
        if(!(transfer_object.destination_path == transfer_object.source_path)){
          files_to_transfer[result_set[this_id]._source.endpoint].push(transfer_object);
        }
  });

  update_transfer_statistics(files_to_transfer);
  return files_to_transfer
}

function update_transfer_statistics(files_to_transfer){
  $('#transfer-statistics').html('');
  for(var ep in files_to_transfer){
      console.log(ep + ': ' + files_to_transfer[ep].length);
      $('#transfer-statistics').append('<b>'+ ep + ': ' + files_to_transfer[ep].length + '</b> objects<br>');
  }
}

function bytesToSize(bytes, precision) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
      var posttxt = 0;
      if (bytes == 0) return 'n/a';
      if (bytes < 1000) {
          return Number(bytes) + " " + sizes[posttxt];
      }
      while( bytes >= 1000 ) {
          posttxt++;
          bytes = bytes / 1000;
      }
      return bytes.toPrecision(precision) + " " + sizes[posttxt];
}