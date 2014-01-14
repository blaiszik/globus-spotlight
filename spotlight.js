           

function load_events(){
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
        $('#input-search').val('*'+$(this).text()+'*');
        perform_search();
    });
    //End button click events 
}

function fileSizeSI(a,b,c,d,e){
    return (b=Math,c=b.log,d=1e3,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(2)
     +' '+(e?'kMGTPEZY'[--e]+'B':'B')
    //kB,MB,GB,TB,PB,EB,ZB,YB
    }

function reset_panels(){
  $('#result-block').hide();
  $('#detail-block').hide();
}
    
function perform_search(){
  $('#detail-block').show();
  $('#result-block').show();
  requestData = {
                  "size":result_size,
                  "query": {
                      "query_string" : {
                          "fields" : ["name^2","endpoint"],
                          "query" : $('#input-search').val()?$('#input-search').val():'*'
                    }
                  }
              };
  $.ajax({
     type: 'POST',
     url: 'http://localhost:9200/globus_public_index/file/_search',
     data: JSON.stringify(requestData),
     success: function(data) {
         result_set = data.hits.hits;
         for(i=0; i<result_set.length; i++){
              if(result_set[i]._source.size > 0){
                  result_set[i]._source.size = fileSizeSI(result_set[i]._source.size);
              }else{
                  result_set[i]._source.size = '0 B';
              }
          }
          new EJS({url:'./templates/search_result.ejs'}).update('ejs-search-result',data); 
     }
  });
}