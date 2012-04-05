$(function() {

	window.VOICEBOXEN = {};
	VOICEBOXEN.PARSE_APP_ID = "wr0JaM2SXMbwTX1Q142F8lFI29elxoPYjE768BEB";
	VOICEBOXEN.PARSE_API_KEY = "HpQBA0WQ2Cxl8FFoGk5QKP3h33wL9LVPGiuwRtJ1";
	VOICEBOXEN.PARSE_HEADERS = {
					"X-Parse-Application-Id" : VOICEBOXEN.PARSE_APP_ID,
					"X-Parse-REST-API-Key" : VOICEBOXEN.PARSE_API_KEY
			};

	VOICEBOXEN.ParseSync = function(method, model, options) {
		return Backbone.sync(method, model, _.extend(options, {
			headers : VOICEBOXEN.PARSE_HEADERS
		}));
	};

	VOICEBOXEN.Application = Backbone.View.extend({
		events : {
			"submit #search_form" : "search",
			"click #search_submit" : "search",
			"click #signup_submit" : "signup",
			"click #login_submit" : "login",
			"click #logout_submit" : "logout"
		},

		initialize : function() {
		},
		signup : function() {
			$.ajax({
				url : "https://api.parse.com/1/users",
				type : "POST",
				data : JSON.stringify({
					username : this.$el.find("#username").val(),
					password : this.$el.find("#password").val()
				}),
				contentType : "application/json",
				dataType : "json",
				headers : VOICEBOXEN.PARSE_HEADERS,
				success : $.proxy(function(resp) {
					var user = new VOICEBOXEN.User(resp);
					this.user = user;
					if(this.cbFunction) {
						var cbFunction = this.cbFunction;
						var cbContext = this.cbContext;
						this.cbFunction = null;
						this.cbContext = null;
						$.proxy(cbFunction, cbContext);
					}

				}, this)
			}).error(function(resp) {
				alert("Sorry, there was a problem creating that user");
			});
		},
		presentLogin : function(cbFunction, cbContext) {
			this.$el.find("#popup").addClass("visible");
			this.cbFunction = cbFunction;
			this.cbContext = cbContext;
		},
		login : function() {
			$.ajax({
				url : "https://api.parse.com/1/login",
				type : "GET",
				data : {
					username : this.$el.find("#username").val(),
					password : this.$el.find("#password").val()
				},
				dataType : "json",
				headers : VOICEBOXEN.PARSE_HEADERS,
				success : $.proxy(function(resp) {
					var user = new VOICEBOXEN.User(resp);
					this.user = user;
					this.$el.find("#popup").removeClass("visible");
					if(this.cbFunction) {
						var cbFunction = this.cbFunction;
						var cbContext = this.cbContext;
						this.cbFunction = null;
						this.cbContext = null;
						$.proxy(cbFunction, cbContext);
					}

				}, this)
			}).error(function(resp) {
				alert("Sorry, there was a problem logging in that user");
			});
		},
		logout : function() {
			this.user = null;
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

	window.VoiceBoxen = new VOICEBOXEN.Application({
		el : $("#application")
	});
	VoiceBoxen.room_code = '';
	VoiceBoxen.user = null;

	VOICEBOXEN.User = Backbone.Model.extend({
		idAttribute : "objectId"

	});

	VOICEBOXEN.Song = Backbone.Model.extend({
		sync : VOICEBOXEN.ParseSync,
		idAttribute : "objectId",
		url : "https://api.parse.com/1/classes/Song",

		initialize : function(attr) {
			if(isNaN(attr.vbid) && !isNaN(attr.id)) {
				//We map the vbid from Voicebo queries to vbid for Parse
				this.set({
					vbid : attr.id
				});
			}

			$.ajax({
				url : this.url,
				type : "GET",
				headers : VOICEBOXEN.PARSE_HEADERS,
				data : {
					where : "{\"vbid\" : " + this.get("vbid") + "}"
				},
				success : $.proxy(function(resp) {
					if(resp.results.length > 0) {
						this.set({
							objectId : resp.results[0].objectId
						});
					}
				}, this)
			});

		},
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
			"click .sing" : "sing",
			"click .sing_later" : "singLater"

		},

		render : function() {
			// this.$el.html(this.model.get("title"));
			this.$el.html(this.template(this.model.toJSON()));
			this.$el.data("artist", this.model.get("artist"));
			return this;
		},
		sing : function() {
			if(this.$el.hasClass("queued"))
				return;
			if(VoiceBoxen.room_code == '') {
				var code = prompt("Please enter your room code");
				if(code !== null && code !== '') {
					VoiceBoxen.room_code = code;
				} else {
					return;
				}
			}
			$.ajax({
				url : "http://vbsongs.com/api/v1/queue.json",
				type : "POST",
				data : {
					song_id : this.model.get("vbid"),
					room_code : VoiceBoxen.room_code
				},
				dataType : "json",
				success : function(resp) {
					this.$el.addClass("queued");
				}
			}).error($.proxy(function(resp) {
				if(resp.status == 403) {
					VoiceBoxen.room_code = '';
					this.sing();
				}
			}, this));
		},
		singLater : function() {
			if(VoiceBoxen.user == null) {
				VoiceBoxen.presentLogin(this.singLater, this);
				return;
			}

			//Save song
			this.model.save({}, {
				success : $.proxy(function(model, resp) {
					//Save song to user
					$.ajax({
						url : "https://api.parse.com/1/classes/UserSongKey",
						type : "POST",
						headers : VOICEBOXEN.PARSE_HEADERS,
						data : {
							user : {
								__type : "Pointer",
								className : "_User",
								objectId : VoiceBoxen.user.get("id")
							},
							song : {
								__type : "Pointer",
								className : "Song",
								objectId : this.model.get("id")
							}
						},
						dataType : "json",
						success : function(resp) {

						}
					});
				}, this)
			});

		}
	});

	VOICEBOXEN.Results = Backbone.Collection.extend({
		model : VOICEBOXEN.Song
	});

	VoiceBoxen.results = new VOICEBOXEN.Results();

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

	VoiceBoxen.resultsView = new VOICEBOXEN.ResultsView({
		collection : VoiceBoxen.results,
		el : $("#results")
	});

	var test = JSON.parse($("#testdata").html());
	VoiceBoxen.results.reset(test.songs);
	// VoiceBoxen.resultsView.render();

});
