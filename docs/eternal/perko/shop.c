inherit  RoomReadCode;
 
#include "path.h"
#include <ansi.h>
 

#define  OTHER_ROOM  STAGE
#define  PRE_LIST    "On the stage, you see "
#define  EMPTY_MSG   "nothing"
#define  SIGN "\n" \
  "               +-----------------------------------+ \n" \
  "               |        The Posh Perko Pit         | \n" \
  "               +-----------------------------------+ \n" \
  "               |    Fine beverages and superior    | \n" \
  "               |        service since 5673.        | \n" \
  "               +-----------------------------------+ \n" \
  "               |   Hot Chocolate             10    | \n" \
  "               |   Hot Tea                   15    | \n" \
  "               |   Coffee                    15    | \n" \
  "               |   Espresso                  25    | \n" \
  "               |   Cafe Latte                35    | \n" \
  "               +-----------------------------------+ \n"
 
#include "RoomPeek.h"
 
void extra_create()
  {
  STAGE->load_me();
  set( "ansi_short", YEL + "The Posh Perko Pit" );
  set( "short", "The Posh Perko Pit" );
  set( "day_color", YEL );
  set( "day_long",
    "You glance around the room, taking in the bustling activity "
    "of the small shop.  A long, oaken counter runs along the "
    "western wall, stools spaced evenly down it, behind which "
    "stands Perko Pete and an impressive array of espresso "
    "machines, roasters, and frothing spigots.  You realize that "
    "pretty much the entire room is constructed out of wood, from "
    "the thick joists supporting the low ceiling to the worn tables "
    "and flooring, the sole exception being the brick, "
    "photograph-laden wall backing the small platform to the north.  "
    "The faint sounds of some sort of jazz music are barely audible "
    "over the low murmering of the patrons as they sit and chat "
    "while sipping at their drinks.  A hand-lettered placard with "
    "the menu hangs on the wall behind the counter, and a wood-"
    "framed glass door leads back outside to the east." );
  set( "descs", ([
    "door" :
      "This door seems to consist of several panes of glass "
      "framed with walnut wood.",                             
    ({ "table", "tables" }) :
      "Several of these small tables seem to be scattered "
      "about the room, the occasional group of college "
      "students seated around them.",
    "counter" :
      "Stools are spaced evenly along this oaken counter, a few even "
      "occupied.  Mug ring stains are scattered over the surface "
      "as well.",
    ({ "machine", "machines", "roaster", "roasters", "spigot", 
       "spigots", "frothing spigot", "frothing spigots" }) :
      "You could be wrong, but those look like Plasma-Driven, Phase-"
      "Induced, Partially-Homoginized Whip-It Machines [tm].  Perfect "
      "for every delectable coffee shop beverage.",
    ({ "joist", "joists" }) :
      "The rough-hewn, oaken joists supporting the ceiling are exposed, "
      "lending an almost ski-lodge type quality to the shop.",
    ({ "floor", "flooring" }) :
      "The slats are snugly fit together, and well-worn, it seems.  "
      "What no-doubt used to be a heavy finishing layer has worn "
      "away in spots, leaving the main traffic pattern visible.",
    ({ "stool", "stools" }) :
      "Each stool spaced along the counter has a black, vinyl cushion "
      "that could probably support your weight without causing you "
      "pain.",
    ({ "wall", "brick" }) :
      "The northern wall is constructed out of old, red bricks, to which "
      "are attached a large number of old photographs.",
    ({ "photographs", "photos", "pictures" }) :
       "The photographs that are covering the walls of the shop seem "
       "to have a common theme: Pete holding a coffee bean in different "
       "places in the world.",
    ({ "patron", "patrons", "student", "students" }) :
      "They each seem to be your average run-of-the-mill coffee addicts.",
    ({ "stage", "platform" }) :
      "The stage at the Perko Pit, to the north, is really "
      "nothing more then a platform raised about a foot off "
      "of the ground.",
    ({ "sign", "list", "prices", "menu", "placard" }) :
      SIGN,
    ]) );
  set( "read", ([
    ({ "sign", "list", "prices", "menu", "placard" }) :
      SIGN,
    ]) );
  set( "exits", ([
    "east" : "@east",
    "west"  : "stock",
    ]));
  set( "invis_exits", ([
    "up"    : "@stage",
    "north" : "@stage",
    "stage" : "@stage",
    ]));
  set( "reset_data", ([
    "pete" : NPC "pete",
    "poet" : NPC "poet",
    "echo" : BASIC "shop_echo",
    ]) );
  set( "day_light", 60 ); 
  set( InsideP, 1 );
  }
 
stage()
  {
  write( "You step up onto the stage.\n" );
  tell_room( STAGE, PNAME + " steps up onto the stage.\n",
    ({ present( "echo", FINDO( STAGE ) ), THISP }) );
  tell_room( THISO, PNAME + " steps up onto the stage.\n",
    ({ present( "echo", THISO ), THISP }) );
//  move_object( THISP, STAGE );
//  command( "glance", THISP );
  return STAGE;
  }

east()
  {
  if(THISP->query("sitting"))
    THISP->stand_up();
  write( "You push the door open and step outside.\n" );
  say( PNAME + " pushes open the front door and steps outside.\n" );
  tell_room( STREET, PNAME + " steps out of the Posh Perko Pit, "
    "to the west.\n" );
//  move_object( THISP, STREET );
//  command( "glance", THISP );
  return STREET;
  }
