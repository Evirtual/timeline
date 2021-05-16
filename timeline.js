$.getJSON("timeline.json", function (data) {

	var board = $("<div/>").attr("id", "board").appendTo('#board-wrapper'),
		boardInner = $("<div/>").addClass("board-inner").appendTo(board),
		brandsDropdownWrapper = $("<div/>").addClass("brands-dropdown-wrapper").prependTo(board),
		brandsDropdown = $("<select/>").addClass("brands-dropdown").appendTo(brandsDropdownWrapper),
		brandsListWrapper = $("<ul/>").addClass("brands-list-wrapper").prependTo(boardInner),
		brandsList = $("<ul/>").addClass("brands-list").prependTo(brandsListWrapper),
		brandsTimelines = $("<ul/>").addClass("brands-timelines").appendTo(boardInner),
		timeLine = $("<ul/>").addClass("timeline").appendTo(board)

	$.each(data, function (index, val) {

		var brand = val.brand.toLowerCase().replace(/<br>/g, '-').replace(/ /g, '-'),
			brandsDropdownOption = $("<option value=" + brand + ">" + val.brand + "</option>").appendTo(brandsDropdown),
			brandsListItem = $("<li id=" + brand + " class='brand'>" + val.brand + "</li>").appendTo(brandsList),
			brandsTimelinesLi = $("<li class='brand-timeline' title=" + brand + "></li>").appendTo(brandsTimelines),
			brandsTimelinesUl = $("<ul/>").appendTo(brandsTimelinesLi),
			brandsListItemInfo = $("<div class='info " + brand + "'><div class='icon'><i class='fa fa-info'></i></div><div class='desc'><img src=" + val.logo + " /><h3>" + val.brand + "</h3><p>" + val.info + "</p></div></div>");

		brandsListItem.append(brandsListItemInfo);
		brandsDropdownWrapper.append(brandsListItemInfo.clone());

		$.each(val.years, function (i, v) {
			brandsTimelinesUl.append("<li class='brand-year'><div class='point'><span class='point-" + v.icon + "' style='background: " + val.color + ";'></span></div><div class='box' style='background: " + val.color + ";'><h3>" + v.year + "</h3><p>" + v.text + "</p><div class='triangle' style='border-top-color: " + val.color + "'></div></div></li>");
		});

	});
	
	// DROPDOWN FUNCTION
	function brandDropdownFn(option) {
		$('.brand-timeline').hide();
		$('.info').hide();
		$('.brand-timeline[title=' + option.val() + ']').css({
			display: 'list-item'
		});
		$('.info.' + option.val()).css({
			display: 'block'
		});
	}
	
	// VISIBLE TIMELINE FUNCTION
	function timelineFn() {
		timeLine.find(".year").remove();

		var years = [];
		var visibleTimeline = $(".brand-year:visible").find("h3").map(function () {
			years.push($(this).text());
		});

		var yearsStart = Math.min.apply(Math, years),
			yearsEnd = Math.max.apply(Math, years);

		for (var year = yearsStart - 2; year <= yearsEnd + 3; year++) {
			timeLine.append("<li id=" + year + " class='year'><div><span>" + year + "</span></div></li>");
		}

	}
	
	// BRAND TIMELINE POINTS FUNCTION
	function brandTimelineFn() {
		//	create brands array with ids and positions
		var brands = [];
		$(".brand").each(function(index) {
			var el = $(this);
			var id = el.attr("id");
			var pos = el.position().left;
			var w = el.width();
			var obj = {
				"id": id,
				"pos": pos,
				"w": w
			};
			brands.push(obj);
		});
		//	put brand-timeline to the same X position as is brand
		$.each(brands, function(index, val) {
			$(".brand-timeline").each(function(index) {
				var el = $(this);
				if (el.attr('title') === val.id && $(window).width() >= 1024) {
					el.css({
						left: val.pos,
						width: val.w + "px"
					});
				} else if ($(window).width() < 1024) {
					el.css({
						left: 0,
						width: '100%'
					});
				}
			});
		});
		//	create years array with ids and positions
		var years = [];
		$(".year").each(function () {
			var el = $(this);
			var id = el.attr("id");
			var pos = el.position().top;
			var obj = {
				"id": id,
				"pos": pos
			};
			years.push(obj);
		});
		//	put brand-year to the same Y position as is timeline
		$.each(years, function (index, val) {
			$(".brand-year").each(function (index) {
				var el = $(this);
				var h3 = el.find("h3");
				var pos = el.position();
				if (h3.text() === val.id) {
					el.css({
						top: val.pos
					});
				}
			});
		});
	}

	//---------------------------------------
	// IT'S TIME TO SHOW THIS TO THE WORLD
	//---------------------------------------
	function sizingTimelines() {
		if ($(window).width() < 1024) {
			timelineFn();
			brandTimelineFn();
		} else {
			timelineFn();
			brandTimelineFn();
		}
	}

	var selectList = $('.brands-dropdown'),
			selectOptFirst = selectList.find("option:first");

	selectList.val(selectOptFirst.val());
	brandDropdownFn(selectOptFirst);

	selectList.on('change', function () {
		$("html, body").animate({scrollTop: 0}, 600);
		brandDropdownFn($(this));
		timelineFn();
		brandTimelineFn();
	});

	$(document).ready(sizingTimelines);
	$(window).resize(sizingTimelines);
	
	// brands fixed postion dropdown
	var brandsDropdownPos = brandsDropdownWrapper.offset().top;
	$(window).resize(function() {
		brandsDropdownWrapper.removeClass('fixed');
		brandsDropdownPos = brandsDropdownWrapper.offset().top;
	});
	$(window).scroll(function(){
		var currentScroll = $(window).scrollTop();
		if (currentScroll >= brandsDropdownPos) {
			brandsDropdownWrapper.addClass('fixed');
		} else {
			brandsDropdownWrapper.removeClass('fixed');
		}
	});
	
	// brands fixed postion
	// var brandsListPos = brandsListWrapper.offset().top - 120;
	// $(window).resize(function() {
	// 	brandsListWrapper.removeClass('fixed');
	// 	brandsListPos = brandsListWrapper.offset().top - 120;
	// });
	// $(window).scroll(function(){
	// 	var currentScroll = $(window).scrollTop();
	// 	if (currentScroll >= brandsListPos) {
	// 		brandsListWrapper.addClass('fixed');
	// 	} else if (currentScroll < brandsListPos) {
	// 		brandsListWrapper.removeClass('fixed');
	// 	}
	// });

}).fail(function (d, textStatus, error) {
	console.error("getJSON failed, status: " + textStatus + ", error: " + error)
});