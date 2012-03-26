$(function() {

	var VoiceBoxen = Backbone.View.extend({
		events : {
			"submit #search_form" : "search",
			"click #search_submit" : "search"

		},

		initialize : function() {
			var submit = this.$el.find("#search_form");
			submit.on("submit", this.search, this);
		},
		search : function(e) {
			var q = $("#search").serialize();
			//Not sure why the API needs an explicit .json but it makes it happier
			$.ajax({
				url : "http://vbsongs.com/api/v1/songs/search.json?" + q + "&per_page=100&page=1",
				dataType : "json",
				success : $.proxy(this.loadResults, this)
			}).error(function(res) {
				alert("Sorry, there was an error performing the search.");
			});
			return false;
		},
		loadResults : function(data) {
			this.results.reset();
			this.results.add(data.songs);
		}
	});

	window.VOICEBOXEN = new VoiceBoxen({
		el : $("#application")
	});
	VOICEBOXEN.room_code = '';

	VOICEBOXEN.Song = Backbone.Model.extend({
		parse : function(resp) {
			if(isNaN(resp.vbid) && !isNaN(resp.id)) {
				//We map the vbid from Voicebo queries to vbid for Parse
				resp.vbid = resp.id;
			}
			return resp;
		}
	});

	VOICEBOXEN.SongView = Backbone.View.extend({
		tagName : "li",
		className : "song",
		template : _.template($("#song-template").html()),
		events : {
			"click .sing" : "queue"
		},

		render : function() {
			// this.$el.html(this.model.get("title"));
			this.$el.html(this.template(this.model.toJSON()));
			this.$el.data("artist", this.model.get("artist"));
			return this;
		},
		queue : function() {
			if(this.$el.hasClasS("queued")) return;
			if(VOICEBOXEN.room_code == ''){
				var code = prompt("Please enter your room code");
				if(code !== null && code !== ''){
					VOICEBOXEN.room_code = code;
				}else{
					return;
				}
			}
			$.ajax({
				url : "http://vbsongs.com/api/v1/queue.json",
				type : "POST",
				data : {
					song_id : this.model.get("vbid"),
					room_code : VOICEBOXEN.room_code
				},
				dataType : "json",
				success : function(resp) {
					this.$el.addClass("queued");
				}
			}).error(function(resp) {
				if(resp.status == 403){
					VOICEBOXEN.room_code = '';
					this.queue();
				}
			});
		}
	});

	VOICEBOXEN.Results = Backbone.Collection.extend({
		model : VOICEBOXEN.Song
	});

	VOICEBOXEN.results = new VOICEBOXEN.Results();

	VOICEBOXEN.ResultsView = Backbone.View.extend({
		initialize : function() {
			var results = this.collection;
			results.on("add", this.onAddResult, this);
			results.on("reset", this.render, this);
		},
		onAddResult : function(song) {
			var songView = new VOICEBOXEN.SongView({
				model : song
			});
			if(this.$el.children().length == 0 || (this.$el.children().last().data("artist") && this.$el.children().last().data("artist") != song.get("artist"))) {
				this.$el.append("<li class='artist'>" + song.get("artist") + "</li>");
			}
			var rendered = songView.render();
			this.$el.append(rendered.el);
		},
		render : function() {
			this.$el.empty();
			this.collection.forEach(this.onAddResult, this);
		}
	});

	VOICEBOXEN.resultsView = new VOICEBOXEN.ResultsView({
		collection : VOICEBOXEN.results,
		el : $("#results")
	});

	var test = JSON.parse($("#testdata").html());
	VOICEBOXEN.results.reset(test.songs);
	// VOICEBOXEN.resultsView.render();

});
