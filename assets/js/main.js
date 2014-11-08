$(function(){

    var $list = $("#list");
    var $playlist = $("#playlist");
    var $playlistStart = $("#playlist_start");
    var $search = $('#query_search');
    var $musicTrigger = $list.children('a');

    /**
     * LIST tree
     */
    $list.jstree({ 'core' : 
        {
        'data' : {
            'url' : function (node) {
                    return node.id === '#' ?
                      'rest/index.php/musics' : false;
                  },
                    'data' : function (node) {
                            return { 'id' : node.id };
                    }
            },
        'multiple' : false
        },
        "plugins" : [ "search", "contextmenu" ],
        "search": {
                'show_only_matches' : true,
                'search_leaves_only' : true
        },
        "contextmenu": {
            "items": function ($node) {
                return {
                    "Add": {
                        "label": "+ Adicionar na playlist",
                        "action": function (obj) {
                            playlist.add($node.id, $node.text);
                        }
                    }
                };
            }
        }
    })
    .on('before_open.jstree', function(node){
        $list.jstree('close_all', "#", 100);
    });

    var clip = new ZeroClipboard(document.getElementById('copy-description'));

    var to = false;
    $('#query_search').keyup(function () {
            if(to) { clearTimeout(to); }
            to = setTimeout(function () {
                    var v = $search.val();
                    if(v.length > 2 || v.length == 0){
                            $list.jstree(true).search(v);
                            player.countSearch();
                    }
            }, 250);
    });

    $list.on("select_node.jstree", function (e, data) {
        var idElement = data.selected[0];
        $(this).jstree('toggle_node', idElement);
    });

    /**
     * Play music on double click
     */
    $(document).on('dblclick', $musicTrigger, function (e) {
        var node = $(e.target).closest("li");
        var idElement = node[0].id;

        $(this).jstree('toggle_node', idElement);

        if(player.isMusic(idElement)){
            var element = player.getElementById(idElement);
            $(this).jstree('select_node', idElement);
            player.play(element);
        }
    });

    $list.on('ready.jstree', function (e, data) {
        var allData = data.instance._model.data;
        var musics = [];

        if (allData) {

            $.each(allData, function (id, obj) {
                if (player.isMusic(id)) {
                    musics.push(obj);
                }
            });

        }

        if (musics.length) {
            player.setMusics(musics);
            player.init();
        }
    })
    
    $playlistStart.on('click', function(){
        playlist.start();
    });
});

var playlist = {
    add: function (sourceId, text) {
        var li = document.createElement("li");
        var text = document.createTextNode(text);
        li.appendChild(text);
        li.setAttribute('data-source-id', sourceId);
        
        document.getElementById('playlist_list').appendChild(li);
    },
    start: function(){
        var playlist = [];
        var sourceId = null;
       
        $.each($('#playlist_list li'), function(){
            sourceId = $(this).attr('data-source-id');
            
            if (player.isMusic(sourceId)) {
                playlist.push(sourceId);
            }
        });
                
        if (playlist.length) {
            player.setPlaylist(playlist);
            player.init();
        } else {
            alert('Playlist vazia');
        }
    }

};

var player = (function(){
    var module = {
            baseUrl: 'rest/',
            prefixChildren: 'children_',
            $btnext: null,
            $btprev: null,
            $musicTitle: null,
            $player: null,
            $source: null,
            musics: null,
            playlist: [],
            currentIndex: null,
            current: null,
            $jstree: null,
            lastItem: null,
            totalSeach: 0,
            init: function(){
                    module.$source = $('#source');
                    module.$musicTitle = $('#musicTitle');
                    module.$player = $('#player');
                    module.$jstree = $('#list').jstree(true);
                    module.$btnext = $('#btnext');
                    module.$btprev = $('#btprev');

                    var location_param = window.location.search;
                    var indexInit = 0;
                    if(location_param.indexOf('?') != -1){
                            var n = location_param.split('=').pop();
                            indexInit = n > (module.musics.length - 1) || n < 0 ? 0 : n;
                    }
                    module.play(module.musics[indexInit]);
                    module.bindEnded();
                    module.bindButtons();
                    module.arrows();
            },
            arrows: function(){

                    var pressedCtrl = false;

                    $(document).keyup(function(e) {
                            if(e.which == 17){
                                    pressedCtrl = false;
                            }
                    });

                    $(document).keydown(function(e) {
                            console.log(e.which);
                            if(e.which == 17){
                                    pressedCtrl = true;
                            }

                            if(pressedCtrl){
                                    switch(e.which) {
                                    case 37:
                                            module.bindPrev();
                                    break;
                                    case 39: 
                                            module.nextAutomatic();
                                    break;
                                    case 67:
                                            console.log('entrou');

                                    break;
                                    default: return;
                                }
                                e.preventDefault();
                            }
                    });
            },
            isMusic: function(id){
                    if(id.indexOf("child") != -1)
                            return true;
                    else
                            return false;
            },
            bindButtons: function(){
                    module.$btnext.on('click', function(){
                            module.nextAutomatic();	
                    });
                    module.$btprev.on('click', function(){
                            module.bindPrev();		
                    }); 
            },
            bindPrev: function(){
                    module.deselect_nodes();
                    if(module.existPrev()){
                            module.play(module.prev());	
                    }else{
                            module.play(module.musics[module.musics.length - 1]);
                    }
            },
            deselect_nodes: function(){
                    var tree = module.$jstree;
                    var selecteds = tree.get_selected();
                    tree.deselect_node(selecteds);
            },
            bindEnded: function(){
                    module.$player.on('ended', function() {
                        module.nextAutomatic();
                    });
            },
            nextAutomatic: function(){
                    module.deselect_nodes();
                    
                    if (module.playlist.length > 0){
                        console.log('playlist');
                        alert('selecionar proxima pelo array de id playlist')
                        return;
                    }
                    console.log('proxima normal');

                    if(module.existNext()){
                            module.play(module.next());	
                    }else{
                            module.play(module.musics[0]);
                    }
            },
            existNext: function(){
                    if(module.currentIndex == (module.musics.length -1)){
                            return false;
                    }else{
                            return true;
                    }
            },
            existPrev: function(){
                    if(module.currentIndex == 0){
                            return false;
                    }else{
                            return true;
                    }
            },
            prev: function(){
                    var keys = Object.keys(module.musics);
                var i = keys.indexOf(module.currentIndex);
                    return i !== -1 && keys[i--] && module.musics[keys[i--]];
            },
            setCurrent: function(element){
                    module.currentIndex = module.getIdByElement(element);
                    module.current = element;
                    var jstree = module.$jstree;
                    jstree.select_node(module.prefixChildren + module.currentIndex);
                    module.copyToClipboard();

            },
            getElementById: function(id){
                    for(i in module.musics){
                            if(module.musics[i].id.indexOf(id) != -1){
                                    return module.musics[i];
                            }
                    }
            },
            next: function(){
                var keys = Object.keys(module.musics);
                var i = keys.indexOf(module.currentIndex);
                i = i < 0 ? 0 : i;
                return i !== -1 && keys[i++] && module.musics[keys[i++]];
            },
            setMusics: function(musics){          
                    module.musics = musics;
            },
            setPlaylist: function(playlist){          
                    module.playlist = playlist;
            },
            play: function(element){
                    module.selectMusic(element);
            },
            selectMusic: function (element) {

                var path = element['a_attr'].href;
                $('#btDownload').attr('href', 'rest/download/' + path);
                module.$source.attr("src", module.baseUrl + path);
                module.$player.load();
                module.setCurrent(element);
                module.setTitle();
            },
            setTitle: function(){
                    module.$musicTitle.html(module.current.text);
            },
            getIdByElement: function(element){
                    return element.id.split('_').pop();
            },
            copyToClipboard : function()
            {
                    var l = window.location;
                    var url = l.origin + l.pathname + '?music=' + module.currentIndex;
                    $('#copy-description').attr('data-clipboard-text',url);
            },
            countSearch: function(){
                    var totalAtual = $('a.jstree-search').length;
                    var $totalSearch = $('#totalSearch');

                    if(totalAtual > 0 && totalAtual != module.totalSeach){
                            var plural = totalAtual > 1 ? ' músicas encontradas' : ' música encontrada';
                            $totalSearch.html(totalAtual + plural).css('visibility', 'visible');
                    }else{
                            $totalSearch.css('visibility', 'hidden');
                    }

            }
    }

    return {
            init: module.init,
            setMusics: module.setMusics,
            setPlaylist: module.setPlaylist,
            isMusic: module.isMusic,
            play: module.play,
            getElementById: module.getElementById,
            countSearch: module.countSearch
    }

}());