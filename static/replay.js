$(function() {
  var elements = $('.block');
  var board = $('.board');
  var resizer = function () {
    var replay = $('.replay');
    var rows = $('.board .row');
    if (replay.length === 0) {
      return;
    }
    var mw = 0, mh = 26, maxh = 100000;
    console.log(window.innerWidth);
    if (window.location.href.indexOf('match') === -1 &&
        window.innerWidth >= 720) {
      mw = 300;
      maxh = 475;
    } else if (window.innerWidth >= 720) {
    }
    var container = $('#container');
    var width = Math.min(window.innerWidth, container.innerWidth());
    var height = Math.min(maxh, window.innerHeight, container.innerHeight());
    var size = Math.min(width - mw, height - mh) - 12;
    var box_size = Math.floor(size / 19.0);
    size = box_size * 19;
    replay.css({'width': (width - mw - 12) + 'px'});
    board.css({'width': box_size * 19 + 'px'});
    if (elements.length) {
      var width = $(elements[0]).width();
      var font_size = box_size / 1.55;
      rows.css({'font-size': font_size});
      elements.css({'width': box_size+'px', 'height': box_size+ 'px'});
    }
    replay[0].offsetHeight; // no need to store this anywhere, the reference is enough
  };
  resizer();
  //$(window).on('resize.fittext orientationchange.fittext', resizer);
});

(function() {
  String.prototype.format = String.prototype.f = function() {
    var i, s;
    s = this;
    i = arguments.length;
    while (i--) {
      s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
  };

  window.replay_callback = function(history) {
    var blockTypes, clearBoard, cont, currentTurn, displayRobotInfo;
    var displayRobotKeyValue, drawBlocks, drawHp, drawScores, drawSingleBlock;
    var drawTurn, findPrevAction, findRobot, formatAction, getBlock;
    var idToLocation, incTurn, loadTurn, locOccupied, playing, stop, timerId;
    var spans = [], drawActions, turn_interval;
    var processing = false;
    drawActions = false;
    cont = $('.replay');
    currentTurn = 0;
    blockTypes = 'red blue obstacle normal suicide guard'.split(' ');
    var updatePrefs = function(prefs) {
      $.ajax({
        //The URL to process the request
          'url' : '/update/prefs',
        //The type of request, also known as the "method" in HTML forms
        //Can be 'GET' or 'POST'
          'type' : 'GET',
        //Any post-data/get-data parameters
        //This is optional
          'data' : prefs,
        //The response from the server
          'success' : function(data) {
          //You can use any jQuery/JavaScript here!!!
            if (data == "success") {
              console.log('request success for prefs:');
              console.log(prefs);
            }
          }
        });
    }
    getBlock = function(loc) {
      return cont.find('#p_' + loc[0] + '_' + loc[1]);
    };
    locOccupied = function(loc, robots) {
      var r, _i, _len;
      for (_i = 0, _len = robots.length; _i < _len; _i++) {
        r = robots[_i];
        if (r.location === loc) {
          return true;
        }
      }
      return false;
    };
    drawSingleBlock = function(loc, newType) {
      var block, t, _i, _len;
      block = getBlock(loc);
      for (_i = 0, _len = blockTypes.length; _i < _len; _i++) {
        t = blockTypes[_i];
        block.removeClass(t);
      }
      block.addClass(newType);
      return block;
    };
    drawHp = function(loc, hp) {
      if (hp < 0) {
        hp = 0;
      }
      return (getBlock(loc)).text(hp);
    };

    drawBlocks = function(oldRobots, newRobots) {
      var robot, _i, _j, _len, _len1, _results;
      var block, dir, aloc, loc;
      if (oldRobots) {
        for (_i = 0, _len = oldRobots.length; _i < _len; _i++) {
          robot = oldRobots[_i];
          if (!locOccupied(robot.location, newRobots)) {
            drawSingleBlock(robot.location, 'normal');
            drawHp(robot.location, '');
          }
        }
      }
      _results = [];
      for (_j = 0, _len1 = newRobots.length; _j < _len1; _j++) {
        robot = newRobots[_j];
        block = drawSingleBlock(robot.location,
                        (robot.player_id === 0 ? 'red' : 'blue'))[0];
        _results.push(drawHp(robot.location, robot.hp));
        if (drawActions && 'action' in robot) {
          action = robot.action;
          if (action[0] === 'move' || action[0] === 'attack') {
            loc = robot.location;
            aloc = action[1];
            if (aloc[0] > loc[0]) {
              dir = 'right';
            } else if (aloc[0] < loc[0]) {
              dir = 'left';
            } else if (aloc[1] > loc[1]) {
              dir = 'down';
            } else {
              dir = 'up';
            }
            var span = document.createElement('span');
            var type = action[0] === 'move' ? 'fa-long-arrow-' : 'fa-long-arrow-';
            span.className = [
              'fa',
              action[0],
              'arrow',
              type + dir,
              dir,
            ].join(' ');
            block.appendChild(span);
          } else if (action[0] === 'suicide') {
            block.className += ' suicide';
          } else if (action[0] === 'guard') {
            block.className += ' guard';
          }
        }
      }
      return _results;
    };
    drawScores = function(robots) {
      var r, score1, score2, _i, _len;
      score1 = 0;
      score2 = 0;
      for (_i = 0, _len = robots.length; _i < _len; _i++) {
        r = robots[_i];
        if (r.hp > 0) {
          if (r.player_id === 0) {
            score1++;
          } else {
            score2++;
          }
        }
      }
      cont.find('.score1').text(score1);
      return cont.find('.score2').text(score2);
    };
    drawTurn = function(turn) {
      return cont.find('.turn').text(turn);
    };
    loadTurn = function(turn) {
      processing = true;
      drawBlocks(history[currentTurn], history[turn]);
      drawScores(history[turn]);
      drawTurn(turn);
      cont.find('.block.highlighted').removeClass('highlighted');
      displayRobotInfo(false);
      processing = false;
      return currentTurn = turn;
    };
    incTurn = function(amt, opt_smooth) {
      var _ref;
      if ((0 <= (_ref = currentTurn + amt) && _ref < history.length)) {
        if (processing)
          return true;
        loadTurn(currentTurn + amt);
        return true;
      }
      return false;
    };
    playing = false;
    timerId = 0;
    turn_interval = 500;
    stop = function() {
      window.clearInterval(timerId);
      playing = false;
      return cont.find('.btn-play').html('<i class="fa fa-fw fa-play"></i>');
    };
    window.play = function() {
      timerId = window.setInterval((function() {
        if (!incTurn(1)) {
          stop();
          return;
        }
      }), turn_interval);
      playing = true;
      return cont.find('.btn-play').html('<i class="fa fa-fw fa-stop"></i>');
    };
    cont.find('.btn-play').click(function() {
      return (playing ? stop : play)();
    });
    cont.find('.btn-prev').click(function() {
      return incTurn(-1);
    });
    cont.find('.btn-next').click(function() {
      return incTurn(1);
    });
    cont.find('.btn-rewind').click(function() {
      return loadTurn(0);
    });
    displayRobotKeyValue = function(disp, k, v) {
      return disp.append($('<li/>').append($('<b/>').text(k)).append(v));
    };
    findPrevAction = function(robotId) {
      var r, _i, _len, _ref;
      if (currentTurn - 1 >= 0) {
        _ref = history[currentTurn - 1];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          r = _ref[_i];
          if (r.robot_id === robotId) {
            return r.action;
          }
        }
      }
      return false;
    };
    formatAction = function(action) {
      var _ref;
      if ((_ref = action[0]) === 'move' || _ref === 'attack') {
        return '[\'{0}\', ({1}, {2})]'.f(action[0], action[1][0], action[1][1]);
      }
      return '[\'{0}\']'.f(action[0]);
    };
    displayRobotInfo = function(robot) {
      var display, nextAction;
      display = $('#robot-info');
      display.empty();
      if (robot) {
        displayRobotKeyValue(display, 'HP', robot.hp);
        displayRobotKeyValue(
            display,
            'Location',
            '({0}, {1})'.f(robot.location[0], robot.location[1]));
        prevAction = findPrevAction(robot.robot_id);
        if (prevAction) {
          displayRobotKeyValue(
              display, 'Last action', formatAction(prevAction));
        }
        if ('action' in robot) {
          return displayRobotKeyValue(
              display, 'Next action', formatAction(robot.action));
        }
      } else {
        return display.append(
            $('<li/>').text('Click a robot to view its info...'));
      }
    };
    findRobot = function(loc) {
      var r, _i, _len, _ref;
      _ref = history[currentTurn];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        r = _ref[_i];
        if (r.location[0] === loc[0] && r.location[1] === loc[1]) {
          return r;
        }
      }
      return false;
    };
    idToLocation = function(id) {
      var x, y, _ref;
      _ref = id.split('_').slice(1, 3), x = _ref[0], y = _ref[1];
      return [parseInt(x), parseInt(y)];
    };
    if (window.location.href.indexOf('match') !== -1) {
      cont.find('.block').click(function() {
        var loc, robot;
        cont.find('.block.highlighted').removeClass('highlighted');
        loc = idToLocation($(this).attr('id'));
        robot = findRobot(loc);
        if (robot) {
          $(this).addClass('highlighted');
          return displayRobotInfo(robot);
        } else {
          return displayRobotInfo(false);
        }
      });
      $(function() {
        $('#toggle-actions').change();
      });
      turn_interval = 400;
    } else {
      cont.find('.board-rows').click(function() {
        window.location = '/rules';
      });
      $(function() {
        window.play();
      });
    }
    clearBoard = function() {
      cont.find('.block.red').removeClass('red').text('');
      return cont.find('.block.blue').removeClass('blue').text('');
    };
    $('#toggle-actions').change(function() {
      if ($(this).is(':checked')) {
        if (!drawActions) {
          drawActions = true;
          drawBlocks(history[currentTurn-1], history[currentTurn]);
        }
        updatePrefs({'show_actions': 'yes'});
      } else {
        if (drawActions) {
          drawActions = false;
          drawBlocks(history[currentTurn-1], history[currentTurn]);
        }
        updatePrefs({'show_actions': 'no'});
      }
    });
    clearBoard();
    return loadTurn(0);
  };
}).call(this);
