var Key = {
  LEFT:   37,
  UP:     38,
  RIGHT:  39,
  DOWN:   40,
  SPACE:  32,

  H:      72, //Home
  HOME:   36, //Home
  W:      87, //Warehouse
  R:      82, //Rules

  L:      76, //Login

  B:      66, //Bots
  P:      80  //Profile
};

/* IE: attachEvent, Firefox & Chrome: addEventListener */
function _addEventListener(evt, element, fn) {
  if (window.addEventListener) {element.addEventListener(evt, fn, false);}
  else {element.attachEvent('on'+evt, fn);}
}

function onInputKeydown(evt) {
  if (!evt) {evt = window.event;} // for IE compatibility
  var keycode = evt.keyCode || evt.which; // also for cross-browser compatibility

  var active_el = document.activeElement;
  if (!(active_el && ((active_el.tagName.toLowerCase() == 'input' && (active_el.type == 'text' || active_el.type == "password")) ||
    active_el.tagName.toLowerCase() == 'textarea'))) {
      // focused element is not text input, hook into input

      if (keycode == Key.LEFT) {
        if ($("#key-left").length>0) $("#key-left").click();}
      else if (keycode == Key.UP) {
        if ($("#key-up").length>0) $("#key-up").click();}
      else if (keycode == Key.RIGHT) {
        if ($("#key-right").length>0) $("#key-right").click();}
      else if (keycode == Key.SPACE) {
        if ($("#key-space").length>0) $("#key-space").click();}

      //the following nav elements are present on every page, so no checking
      else if (keycode == Key.H || keycode == Key.HOME) {
        $("#key-home").click();}
      else if (keycode == Key.W) {
        $("#key-w").click();}
      else if (keycode == Key.R) {
        $("#key-r").click();}

      else if (keycode == Key.L) {
        if ($("#key-l").length>0) $("#key-l").click();}

      else if (keycode == Key.B) {
        if ($("#key-b").length>0) $("#key-b").click();}
      else if (keycode == Key.P) {
        if ($("#key-p").length>0) $("#key-p").click();}
  }
}

function addevt() {
  _addEventListener('keydown', document, onInputKeydown);
  $(".btn-play").focus(); //so that pressing <enter>/<space> starts animation
}

$( function()
{
    var targets = $( '[rel~=tooltip]' ),
        target  = false,
        tooltip = false,
        title   = false;

    targets.bind( 'mouseenter', function()
    {
        target  = $( this );
        tip     = target.attr( 'title' );
        tooltip = $( '<div id="tooltip"></div>' );

        if( !tip || tip === '' )
            return false;

        target.removeAttr( 'title' );
        tooltip.css( 'opacity', 0 )
               .html( tip )
               .appendTo( 'body' );

        var init_tooltip = function()
        {
            if( $( window ).width() < tooltip.outerWidth() * 1.5 )
                tooltip.css( 'max-width', $( window ).width() / 2 );
            else
                tooltip.css( 'max-width', 340 );

            var pos_left = target.offset().left + ( target.outerWidth() / 2 ) - ( tooltip.outerWidth() / 2 ),
                pos_top  = target.offset().top - tooltip.outerHeight() - 20;

            if( pos_left < 0 )
            {
                pos_left = target.offset().left + target.outerWidth() / 2 - 20;
                tooltip.addClass( 'left' );
            }
            else
                tooltip.removeClass( 'left' );

            if( pos_left + tooltip.outerWidth() > $( window ).width() )
            {
                pos_left = target.offset().left - tooltip.outerWidth() + target.outerWidth() / 2 + 20;
                tooltip.addClass( 'right' );
            }
            else
                tooltip.removeClass( 'right' );

            if( pos_top < 0 )
            {
                var pos_top  = target.offset().top + target.outerHeight();
                tooltip.addClass( 'top' );
            }
            else
                tooltip.removeClass( 'top' );

            tooltip.css( { left: pos_left, top: pos_top } )
                   .animate( { top: '+=10', opacity: 1 }, 50 );
        };

        init_tooltip();
        $( window ).resize( init_tooltip );

        var remove_tooltip = function()
        {
            tooltip.animate( { top: '-=10', opacity: 0 }, 50, function()
            {
                $( this ).remove();
            });

            target.attr( 'title', tip );
        };

        target.bind( 'mouseleave', remove_tooltip );
        tooltip.bind( 'click', remove_tooltip );
    });
    addevt();
});
