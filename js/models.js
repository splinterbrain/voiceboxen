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
				success : $.proxy(this.loadResults,this)
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

	window.VOICEBOXEN = new VoiceBoxen({el : $("#application")});
	
	VOICEBOXEN.Song = Backbone.Model.extend({

	});

	VOICEBOXEN.SongView = Backbone.View.extend({
		tagName : "li",

		render : function() {
			this.$el.html(this.model.get("title"));
			return this;
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
			var rendered = songView.render();
			this.$el.append(rendered.el);
		},
		render : function() {
			this.$el.empty();
			this.collection.forEach(this.onAddResult
				
			, this);
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
