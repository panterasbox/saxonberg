/*
 *  the EOTL lounge.
 */

/*
 * December 7th: New Non-Combat stuff
 *      Minister
* Fixed the stupid consider/query thing.
* january sometime.  -Min
 */

inherit RoomCode;
inherit DescCode;
#define STEAL "gets kicked down for stealing in the lounge."
#define HEART "/zone/null/eternal/common"
#define LOUNGE "/zone/null/eternal/lounge/"
#define MACHINE "/usr/locus/open/mac"
#define WALL "/obj/status/status_w"
#define PKILL "/obj/status/pkills/pkill_w"
#include "/zone/null/eternal/objects/sanctuary.h"


void extra_reset()
{
    if (!present("wall")) {
	call_other(WALL, "foo");
	move_object(WALL,THISO);
    }
    /*
	if (!present("monument")) move_object(clone_object(PKILL),THISO);
    */
    if (!present("machine")) move_object(clone_object(MACHINE),THISO);
    /*
	    if(!present("lotto machine"))
		move_object(clone_object("/zone/null/eternal/objects/lotto.c"), THISO);
	*/  /* Commented out at Xray's request -Nguu */
}

void extra_init()
{
    add_action("steal", "steal");   //shouldn't be allowed to steal here -Locus
}

void extra_create()
{
    set_short("EotL Lounge");
    set_long(
      "Welcome to the End of the Line player lounge.  It consists of a " +
      "spacious room filled with lots of couches and easy chairs for " +
      "weary adventurers like yourself to relax in.  There is a bar to " +
      "the north, and a circular staircase leads down to that renowned " +
      "metropolis, Eternal City.  WARNING: KILLING IS NOT PERMITTED ON THESE PREMISES.\n");
    set_day_light(10);
    set_night_light(10);
    add_exit("north","/zone/null/eternal/lounge/bar");
    add_exit("down","/zone/null/eternal/common");

    add_description("couch", "It looks very comfortable and inviting.");
    add_description("chair","*couch");
    add_property( THISO, NoCombatP );
}
steal(str)
{
    if( !str ) return 0;
    write("You can't steal in here!"+endl);
    write("You get kicked out of the lounge for anti-social behavior."+endl);
    THISP->move_player(STEAL,HEART);
    THISP->glance();
    return 1;
}
attempt_combat(att, vic) {
    object Heart;
    string attname;
    object Kop;
    if(!att)att=THISP;
    if(att->in_combat()) {
	attname=att->query_name();
	Heart = find_object("/zone/null/eternal/common");
	tell_object(att, "You just messed up, buck-o!\n" +
	  "The Keystone Kops arrive and drag you away!!\n");
	Kop = clone_object("/usr/minister/open/anti-pk/Kop.c");
	tell_room(Heart, attname+" is dragged kicking and screaming in by the Keystone Kops!!\n");
	move_object(att, "/zone/null/eternal/common");
	move_object(Kop, "/zone/null/eternal/common");
	tell_room(THISO, attname+" just tried to start combat!!\n");
	tell_room(THISO, "The Keystone Kops arrive and haul "+attname+" away!!\n");
	Kop->attack_object(att);
	return 1;
    }
    else return 0;
}
