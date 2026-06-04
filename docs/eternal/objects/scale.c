#include <ansi.h>
#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;

extra_create() {
    set("id","scale");
    set("short","Anthrax's Magic Scale");
    set("long","This is a large, flat, boxlike device, with some sort of "+
      "display window on the front.  You can try to 'weigh <item>' on "+
      "it...\n");
    set( MagicP, 1 );
    set("gettable", 0);
    set("droppable", 0);
}

extra_init()  {
    if( THISP && ENV( THISP ) == ENV(THISO) )
	add_action( "weigh", "weigh" );
}

weigh(string str) {
    object thing, *ansis, *noansis;
    int weight, ansi;
    string w;

    if(!str || !present(str, THISP))
    {
	write("You don't seem to be carrying that.\n");
	return 1;}

    thing=present(str, THISP);

    if(thing->query_worn())
    {
	write("You can't weigh something you're wearing!\n");
	return 1;
    }

    if(thing->query_wielded())
    {
	write("You can't weigh something you're wielding!\n");
	return 1;
    }
    ansi = THISP->query_ansi();
    weight=thing->query("weight");
    // Putting it in terms someone can understand...
    // - Jimbotomy
    w = sprintf("%d.%d lbs. (%d.%d kilos)", weight/50,
      (weight%50)/5, weight/110, (weight%110)/11);

    write("You place "+thing->query("short")+" on the Magic Scale.\n");
    say(PNAME+" places "+thing->query("short")+" on the Magic Scale.\n");
    noansis = filter_array( all_inventory(ENV(THISO)), #'living );
    ansis = filter_objects( noansis, "query_ansi" );
    noansis = noansis - ansis;
    tell_room(ENV(THISO), "A large, glowing red number appears on the display: ");
    tell_room(ENV(THISO), RED+w+NOR+NOR2+"\n", noansis);
    tell_room(ENV(THISO), w+"\n", ansis);
    return 1;
}
