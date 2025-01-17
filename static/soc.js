var params = parseQueryString();
loadReferences();
loadCourses(); 

var allUnits = [], allSubjects = [];
function loadReferences() {
  //TODO generalize it
  //TODO make sure data is sorted on server
  $.getJSON( "/static/references.json.gz", function( data ) {
    console.log("reference data loaded");

    // load subjects
    var list = data.subjects;
    var s = "";
    for (k in list) {
      s = s+"<label><input type='checkbox' name='subject' value='"+list[k].code+"' /><span>"+
        list[k].code+" - "+list[k].description.toLowerCase()+"</span></label>";
      allSubjects[list[k].code] = list[k].description.toLowerCase();  
    }
    $("#subject-query .multi-check").append(s);

    // load core codes
    list = data.coreCodes;
    s = "";
    for (k in list) {
      s = s+"<label><input type='checkbox' name='core' value='"+list[k].code.toUpperCase()+"' /><span>"+
        list[k].code.toUpperCase()+" - "+list[k].description.toLowerCase()+"</span></label>";
    }
    $("#core-query .multi-check").append(s);

    // load unit codes
    list = data.units;
    for (k in list) {
      allUnits[list[k].code] = list[k].description.toLowerCase();  
    }
  });
}

function loadCourses() {
  // TODO: make sure json data with proper expiration header
  // load all courses
  var courseURL = "";
  if (params.semester) 
    courseURL = "/static/"+params.semester[0]+"courses.json.gz";
  else
    window.location.replace("/static/sochome.html");

  $.getJSON(courseURL, function( data) {
    console.log("course data loaded");

    // parse data and generate dom nodes
    parseData(data);

    //load first page
    loadPage(0, true);
  });
}

function loadPage(i) {
  // remove old page
  $(".result").empty();
  // attach new dom nodes from new page online
  console.log("load page "+i);
  pages[i].appendTo(".result");

  // setup event for course nodes to expand
  $(".title").click(function() {
    $(this).parent().toggleClass("expanded");
  });

  // get dynamic filter values after loading new dom nodes from new page
  var dynamicFilter = [];
  $(".section, .course").each(function( index ) {
    var classes = $(this).attr("class").split(" ");
    for (var i=1; i < classes.length; i++) {
      dynamicFilter[classes[i]] = classes[i]; 
    }
  });

  // insert filters based on what are in the search result domTree
  console.log("create dynamic filters");

  $("#location-filters .multi-check").empty().append(
    createFilters(".section.", "LC-", dynamicFilter));
  $("#level-filters .multi-check").empty().append(
    createFilters(".course.", "LVL-", dynamicFilter));
  $("#unit-filters .multi-check").empty().append(
    createFilters(".course.", "OUC-", dynamicFilter, allUnits));
  $("#subject-filters .multi-check").empty().append(
    createFilters(".course.", "SUB-", dynamicFilter, allSubjects));

  // setup event for all filters to tricker filter action
  $("[data-filter]").click(function() {
    applyFilters();
  });

  applyFilters();

  // keep expanded as is after loading new page
  if (expanded)
    $('.course').addClass("expanded");

  console.log("done with loading page "+i);
}

var pages = [], pagesize = 2000;
function parseData(data) {
  console.log("refreshing data");
  
  var courses = "";
  for(var i=0; i<data.length; i++) {
    // TODO format data use data as-is amap or format on server and assign class
    // query the json object before creating dom node
    if (query(data[i]))
      courses = courses + createCourse(data[i]);
  }
  courses = "<div class='data'>"+courses+"</div>";

  // create offline domTree with all courses from server feed
  var data = $(courses);

  // devide search result dom nodes into pages
  // load page by page to improve filtering perform better with less dom nodes
  var numberOfCourses = data.children().length;
  for (var i=0; i<Math.floor(numberOfCourses/pagesize)+1; i++) {
    pages[i] = data.children().slice(0, pagesize).detach();
  }
  // create summary info of search result 
  $(".summary").append("Total "+numberOfCourses+" courses found.");
  if (pages.length > 1) {
    for (var i=0; i<pages.length; i++) {
      $(".summary").append("<a class='page' onclick='loadPage("+i+")'>"+(i*pagesize)+"</a>");
    }
  }
}

// query each course json object to decide if it should be included
function query(course) {
  try { // query campus code
    if (params.campus && params.campus.indexOf(course.campusCode)<0) return false;
  } catch(err) {}
  try { // query school code
    if (params.school && params.school.indexOf(course.offeringUnitCode)<0) return false;
  } catch(err) {}
  try { // query subject code
    if (params.subject && params.subject.indexOf(course.subject)<0) return false;
  } catch(err) {}
  try { // query core code
    if (params.core) {
      var found = false;
      for(var k in course.coreCodes) {
        if (params.core.indexOf(course.coreCodes[k].code.toUpperCase())>=0) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  } catch(err) {}
  try { // query level code
    if (params.level && params.level.indexOf(
      ""+((Number(course.courseNumber)-Number(course.courseNumber)%100)))<0) return false;
  } catch(err) {}
  try { // query keyword
    if (params.key) {
      if (course.title.toLowerCase().indexOf(params.key)<0 &&
          course.title.toLowerCase().indexOf(params.key)<0
      ) return false;
    }
  } catch(err) {}

  // TODO anyother query checking such as class mode, ect.
  return true;  
}

function applyFilters() {
  console.log("apply filters");
  // collect all unchecked filters and group them all together
  var filters = $("[data-filter]:not(:checked)").map(function() {
    return $(this).data("filter");
  }).get().join(',');

  // reset course nodes
  $(".course").removeClass("hide");

  // remove old CSS 
  $("#filters").remove();
  // add new CSS based on filters
  // IMPORTANT this is critical for performance since it take full advantage of browser
  // native dom node query capability. It only take less than 50ms.
  $("<style type='text/css' id='filters'> "+filters+",.course.hide"+ "{display:none;} </style>").appendTo("head");

  //hide empty courses due to sections being filtered out and hidden
  hideEmptyCourse(filters);
}

function hideEmptyCourse(filters) {
  // IMPORTANT This is critical to use build-in css class filter instead of jQuery :visible
  // for huge performace gain
  $(".section").removeClass("marker");
  $(filters).addClass("marker");
  $(".section").toggleClass("marker");
  $(".course").filter(function(){
      return $(this).find(".section.marker").length == 0;
  }).addClass("hide");  
}

// this is used to generate all dynamic filters
var template = "<label><input type='checkbox' data-filter='{filter-value}' checked /><span>{display-value}</span></label>";
function createFilters(domNodePrefix, filterTypePrefix, dynamicFilter, reference) {
  var s="", sorted = Object.keys(dynamicFilter).sort();
  for(var k in sorted) {
    // there are mixed types of filters in the dynamicFilter array, choose the one match with filterTypePrefix
    if (dynamicFilter[sorted[k]].indexOf(filterTypePrefix)==0) {
      // remove fiter type prefix so it can be used to generate dynamic filters
      var displayValue = dynamicFilter[sorted[k]].replace(filterTypePrefix, "");
      // translate code to display value using reference table
      try { displayValue = displayValue+" - "+reference[displayValue]; } catch(err) { }
      // prefix is used to target certain dom nodes
      s = s + template.replace("{filter-value}", domNodePrefix+dynamicFilter[sorted[k]]).replace("{display-value}", displayValue);
    }
  }
  return s;
}

function createCourse(c) {
  var labels = [];
  if (c.coreCodes.length > 0) {
    for(var k in c.coreCodes)
      labels.push("CORE-"+c.coreCodes[k].code.toUpperCase());
  }
  labels.push("OUC-"+c.offeringUnitCode);
  labels.push("SUB-"+c.subject);
  labels.push("LVL-" + ((Number(c.courseNumber)-Number(c.courseNumber)%100)) );
  labels.push("CC-"+c.campusCode);

  var sections = "";
  for(var i=0; i<c.sections.length; i++) {
    var s = createSection(c.sections[i]);
    sections = sections + s.content;
  }

  var content = "<div class='course "+labels.join(" ")+"'>"+"<div class='title'>"+
    "<span>"+c.offeringUnitCode+"</span>"+
    "<span>"+c.subject+"</span>"+
    "<span>"+c.courseNumber+"</span>"+
    "<span class='short-desc'>"+c.title.toLowerCase()+"</span>"+"</div>"+
    sections+
    "</div>";

  return content;
}

function createSection(s) {
  var labels = [], content = "", meetings = "", oncampus=false, hybrid=false, online=false;
  for(var i=0; i<s.meetingTimes.length; i++) {
    var m = createMeeting(s.meetingTimes[i]);
    for (var attr in m.labels) { labels[attr] = m.labels[attr]; }
    meetings = meetings + "<li>"+m.content+"</li>";
    //TODO move the server side
    if (s.meetingTimes[i].meetingModeCode == '91') 
      hybrid = true;
    else if (s.meetingTimes[i].meetingModeCode == '90')
      online = true;
    else
      oncampus = true;      
  }
  type = "CT-ONCAMPUS";
  if (!oncampus && !hybrid) {
    type = "CT-ONLINE";
  } else if (online || hybrid) {
    type = "CT-HYBRID";
  }
  labels[type] = "";

  labels["OS-"+s.openStatus] = "";
  labels["CC-"+s.campusCode] = s.campusCode;

  content = "<div class='section "+keys(labels).join(" ")+"'>"+
    "<span>"+s.number+"</span>"+"<span>"+s.index+"</span>"+
    "<ul>"+meetings+"</ul>"+
    "</div>";

  return {"labels":labels, "content":content};
}

function createMeeting(m) {
  var labels = [], content = "";
  if (m.meetingDay == null) {
    content = "<span>Hours by Arrangement</span>";
  } else {
    //TODO do all logic on server side
    var start = m.pmCode, end = m.pmCode;
    if (Number(m.endTime.substring(0,2))==12) end = "P";
    if (Number(m.startTime.substring(0,2))>7 && Number(m.startTime.substring(0,2))<12) start = "A";
    content = "<span>"+m.meetingDay+"  "+m.startTime.substring(0,2)+":"+m.startTime.substring(2,4)+start+" - "+m.endTime.substring(0,2)+":"+m.endTime.substring(2,4)+end+"</span>";

    if (Number(m.startTime.substring(0,2))>5 && m.pmCode=='P') {   
      labels["MT-"+m.meetingDay+'N'] = "";
    } else {
      labels["MT-"+m.meetingDay+m.pmCode] = "";
    }
  }

  if (m.campusAbbrev != null) {
    content += "<span>"+m.campusAbbrev+"</span>";
    //TODO fix d/c, **, other invalid character on server etc
    var cc = m.campusAbbrev.replace("/", "N").replace("**", "");
    if (cc.length > 0) {
      labels["LC-"+cc] = cc;
    }
  } else {
    content += "<span></span>";
  }
  if (m.buildingCode != null) {
    content += "<span>"+m.buildingCode+"-"+m.roomNumber+"</span>";
  } else {
    content += "<span></span>";
  }
  //content += "<span>Mode: "+m.meetingModeCode+m.meetingModeDesc+"</span>";

  return {"labels":labels, "content":content};
}

function parseQueryString() {
    var queries = {};
    // convert query string into arrays of parameters
    $.each(decodeURIComponent(document.location.search).substr(1).split('&'), function(c,q){
        var i = q.split('=');
        if (queries[i[0]] == null) queries[i[0]] = [];
        queries[i[0]].push(i[1]);
    });

    // convert level search U or G to level code
    var level = [];
    if (queries.level) {
      if (queries.level.indexOf('U')>=0) level = level.concat(['0','100','200','300', '400']);
      if (queries.level.indexOf('G')>=0) level = level.concat(['500','600','700','800']);
      queries.level = level;
    }

    // pass semester value along
    if (queries.semester) { $("input[name='semester']").val(queries.semester[0]); }

    console.log(queries);
    return queries;
}

var expanded = false;
$("#expand").click(function() {
  if (expanded)
    $('.course').removeClass("expanded");
  else 
    $('.course').addClass("expanded");
  expanded = !expanded;
});

function keys(o) {
  var keys = [];
  for(k in o) keys.push(k);
  return keys;
}