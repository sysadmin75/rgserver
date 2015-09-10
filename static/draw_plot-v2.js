$(function() {
  var mydata = data;
  var mygdata = gdata;
  var max_color = '';
  if (max_rating >= 2400) {
    max_color = 'red';
  } else if (max_rating >= 1800) {
    max_color = 'darkorange';
  } else if (max_rating >= 1200) {
    max_color = 'blue';
  } else if (max_rating >= 600) {
    max_color = 'green';
  } else {
    max_color = 'dimgray';
  }
  var rating_markings = [
    {
      yaxis: { to: 600, },
      color: 'lightgray',
    },
    {
      yaxis: { from: 600, to: 1200 },
      color: 'lightgreen',
    },
    {
      yaxis: { from: 1200, to: 1800 },
      color: 'PaleTurquoise',
    },
    {
      yaxis: { from: 1800, to: 2400 },
      color: 'palegoldenrod',
    },
    {
      yaxis: { from: 2400, },
      color: 'pink',
    },
    {
      yaxis: { from: max_rating, to: max_rating },
      lineWidth: 1,
      color: max_color,
    },
    {
      color: 'gray',
      lineWidth: 1,
      xaxis: { from: last_updated, to: last_updated },
    },
  ];
  var main_options = {
    series: {
      lines: {
        show: true,
      },
    },
    xaxes: [{
      mode: 'time',
      minTickSize: [1, "day"],
    }],
    yaxes: [
      {
        tickDecimals: 0,
      },
      {
        tickDecimals: 0,
        position: 'right',
        min: 1,
        minTickSize: 1,
        transform: function(a) { return -a; },
        inverseTransform: function(a) { return -a; },
      }
    ],
    selection: {
      color: 'magenta',
      mode: 'x',
    },
    grid: {
      hoverable: true,
      markings: rating_markings,
    },
    legend: {
      position: 'se',
      backgroundOpacity: 0.5,
    },
  };
  var plot = $.plot($("#chart"), mydata, main_options);
// http://people.iola.dk/olau/flot/examples/interacting.html
  function showttp(x, y, contents) {
    $('<div id="ttp">' + contents + '</div>').css( {
      position: 'absolute',
      display: 'none',
      top: y - 30,
      left: x + 10,
      color: 'black',
      border: '1px solid black',
      padding: '2px',
      'background-color': 'white',
      opacity: 1,
    }).appendTo("body").fadeIn(200);
  }
  var previousPoint = null;
  var display_tooltip = function(item) {
    if (item) {
      if (previousPoint != item.dataIndex) {
        previousPoint = item.dataIndex;

        $("#ttp").remove();
        var num = Math.round(item.datapoint[1]);
        var msg = "&nbsp;" + num + "&nbsp;";
        if (item.series.label !== undefined) {
          msg = item.series.label + ":" + msg;
        }
        showttp(item.pageX, item.pageY, msg);
      }
    } else {
      $("#ttp").remove();
      previousPoint = null;
    }
  }
  $("#chart").bind("plothover", function (event, pos, item) {
    display_tooltip(item);
  });

  // Only show overview and stats on large screens
  if ($("#overview").height() > 0) {
    var overview_options = {
      series: {
        lines: {
          show: 'show',
          lineWidth: 1,
        },
        shadowSize: 0,
      },
      xaxes: [{
        ticks: [],
        mode: 'time',
      }],
      yaxes: [
        {
          ticks: [],
        },
        {
          ticks: [],
          min: 1,
          tickDecimals: 0,
          position: 'right',
          transform: function(a) { return -a; },
          inverseTransform: function(a) { return -a; },
        }
      ],
      selection: {
        color: 'magenta',
        mode: 'x'
      },
      legend: {
        labelFormatter: function(a) {return '';},
      },
      grid: {
        markings: rating_markings,
      },
    };
    var overview = $.plot($("#overview"), mydata, overview_options);
    $("#chart").bind("plotselected", function (event, ranges) {
      // do the zooming
      $.each(plot.getXAxes(), function(_, axis) {
        var opts = axis.options;
        opts.min = ranges.xaxis.from;
        opts.max = ranges.xaxis.to;
      });
      plot.setupGrid();
      plot.draw();
      plot.clearSelection();

      // don't fire event on the overview to prevent eternal loop

      overview.setSelection(ranges, true);
    });
    $("#overview").bind("plotselected", function (event, ranges) {
      plot.setSelection(ranges);
    });
    $("#overview").bind("plotunselected", function (event, ranges) {
      $.each(plot.getXAxes(), function(_, axis) {
        var opts = axis.options;
        delete opts.min;
        delete opts.max;
      });
      plot.setupGrid();
      plot.draw();
      plot.clearSelection();
    });
  }

  if ($("#stat").height() > 0) {
    var colored = [];
    rating_markings.forEach(function(value, index, arr) {
      if (value.yaxis !== undefined) {
        var data = [];
        mygdata.forEach(function(v2, i2, a2) {
          if (value.yaxis.from !== undefined &&
              v2[0] < value.yaxis.from) {
            return;
          }
          if (value.yaxis.to !== undefined &&
              v2[0] >= value.yaxis.to) {
            return;
          }
          data.push(v2);
        });
        var series = {
          data: data,
        };
        colored.push(series);
      }
    });
    var line_color = '';
    if (cur_rating >= 2400) {
      line_color = 'red';
    } else if (cur_rating >= 1800) {
      line_color = 'darkorange';
    } else if (cur_rating >= 1200) {
      line_color = 'blue';
    } else if (cur_rating >= 600) {
      line_color = 'green';
    } else {
      line_color = 'dimgray';
    }
    var stat_options = {
      series: {
        bars: {
          show: true,
          barWidth: 100,
          lineWidth: 0,
        },
      },
      xaxes: [
        {
          tickDecimals: 0,
        },
      ],
      yaxes: [
        {
          tickDecimals: 0,
        },
      ],
      colors: [
        'dimgray',
        'green',
        'blue',
        'darkorange',
        'red'
      ],
      grid: {
        //clickable: true,
        hoverable: true,
        markings: [
          {
            color: line_color,
            lineWidth: 2,
            xaxis: { from: cur_rating, to: cur_rating},
          },
        ]
      }
    };
    var stat = $.plot($("#stat"), colored, stat_options);
    $("#stat").bind("plothover", function (event, pos, item) {
      display_tooltip(item);
    });
    /*$("#stat").bind("plotclick", function (event, pos, item) {
      if (item) {
        window.location = '/directory?upper=' + (item.datapoint[0] + 100);
      }
    });*/
  }
});
