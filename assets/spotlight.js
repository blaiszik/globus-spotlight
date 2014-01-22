           

function load_events(){
  console.log('Loading events');
    $('.btn-radio-group').button();
    $('#input-search').keyup(function() {
        perform_search();// get the current value of the input field.
    });

    $('#btn-search').click(function(){
        perform_search();
    });     

    $('#btn-start-transfer').click(function(){ 
        console.log('transferring...');
    });       

    $('.btn-radio').click(function(){
        $('.btn-radio').removeClass('btn-primary');
        $('.btn-radio').addClass('btn-default');
        $(this).addClass('btn-primary');
    })

    $('.quick-tag').click(function(){
        val = $('#input-search').val()
        if(val){
          val = val + ' ' 
        }
        $('#input-search').val( val + $(this).text());
        perform_search();
    });

    $('#btn-select-all').on("click",function(){
      $('.result-set-item').addClass('result-set-item-selected');
    });

    $('#btn-select-none').click(function(){
      $('.result-set-item').removeClass('result-set-item-selected');
    });

    $('#btn-select-inverse').click(function(){
      console.log($('.result-set-item'));
      $('.result-set-item').toggleClass('result-set-item-selected');
    });

    $('#btn-add-tag').click(function(){
      tag_array = $('#input-add-tag').val().trim().split(',');
      console.log(tag_array);
      len = tag_array.length;      
      for (i = 0; i < len; i++){
          tag_array[i] = tag_array[i].trim();  
      }

      tag_html = "<label class='label label-primary'>" + tag_array.join("</label> <label class='label label-primary'>") + "</label>";


      $('.result-set-item-selected').each(function(index){
        this_id = $( this ).attr('id').split('-').slice(2).join('-');
        console.log(this_id);
        console.log( "Adding tags to the following records: " + this_id);
        $('#result-set-tag-'+this_id).html(tag_html);
        perform_update(this_id, tag_array);
      });
    });
    //End button click events 
}

function load_live_events(){
  $('.result-set-item').click(function(){
        $(this).toggleClass('result-set-item-selected');
        console.log('clicked result');
      });

  $('.label-last-modified').each(function( index ) {
      val = $('.label-last-modified')[index].innerText.trim();
      if(val){
              var d = new Date(val);
      }
      console.log(val);
      console.log(d);
      $('.label-last-modified')[index].innerText = d.toString();
  });
}

function fileSizeSI(a,b,c,d,e){
    return (b=Math,c=b.log,d=1e3,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(2)
     +' '+(e?'kMGTPEZY'[--e]+'B':'B')
    //kB,MB,GB,TB,PB,EB,ZB,YB
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


function reset_panels(){
  $('#result-block').hide();
  $('#detail-block').hide();
}

function perform_update(this_id, tag_list){

  requestData = {
                  "script" : "ctx._source.tags = test"
              };

  $.ajax({
     type: 'GET',
     url: 'http://localhost:9200/globus_public_index/file/'+this_id,
     data: JSON.stringify(requestData),
     success: function(data) {
        console.log(data);
        the_id = data._id;
        source = data._source;
        source.tags = tag_list;
         $.ajax({
           type: 'PUT',
           url: 'http://localhost:9200/globus_public_index/file/'+this_id,
           data: JSON.stringify(source),
           success: function(){

           }
         });
     }
   });


}

function perform_search(){
  $('#detail-block').show();
  $('#result-block').show();
  requestData = {
                  "size":result_size,
                  "query": {
                      "query_string" : {
                          "fields" : ["tags^3", "name^2", "endpoint"],
                          "query" : $('#input-search').val()?$('#input-search').val():'*'
                    }
                  }
              };
  $.ajax({
     type: 'POST',
     url: 'http://localhost:9200/globus_public_index/file,catalog/_search',
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
          load_live_events();
          result_file_size_html = "<b>"+data.hits.total+' results found | > '+fileSizeSI(result_file_size)+"</b>";
          $('#result-file-size').html(result_file_size_html);


     }
  });
}