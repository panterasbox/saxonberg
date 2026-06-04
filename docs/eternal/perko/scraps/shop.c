inherit  RoomReadCode;
 
#include "path.h"
#include <ansi.h>
 
#define  OTHER_ROOM  STAGE
#define  PRE_LIST    "On the stage, you see "
#define  EMPTY_MSG   "nothing"
#define  SIGN "\n" \
  "                The Posh Perko Pit: You'll be awake   \n" \
  "                for hours sampling our many fine      \n" \
  "                 coffees.. and we do mean HOURS..     \n" \
  "                                Menu                  \n" \
  "               +------------------------------------+ \n" \
  "               |      Item                  Cost    | \n" \
  "               |------------------------------------| \n" \
  "               |   Hot Chocolate             100    | \n" \
  "               |   Hot Tea                   200    | \n" \
  "               |   Coffee                    300    | \n" \
  "               |   Espresso                  400    | \n" \
  "               |   Cappuchino                500    | \n" \
  "               |   Cafe Latte                600    | \n" \
  "               |   Cafe Mocha                700    | \n" \
  "               +------------------------------------+ \n"
 
#include  "/usr/walker/collegeville/lib/RoomPeek.h"
 
 
stand_up( string str )
  {
  string tietal;
  if( sscanf( THISP->query_title(), "%s[sitting]", tietal ) )
    {
    if( !str || str == "up" )
      {
      THISP->set_title( tietal );
      write( "You pull yourself to your feet.\n" );
      say( strformat( PNAME + " pulls " + objective(THISP) +
        "self to " + possessive(THISP) + " feet." ) );
      return 1;
      }
    return 0;    
    }
  return 0;
  }
 
sit_down( string str )
  {
  string tietal;
  if( !str )
    {
    write( "Sit where?\n" );
    return 1;
    }
  if( !sscanf( THISP->query_title(), "%s[sitting]", tietal ) )
    {
    if( str == "down" || str == "on the chair" 
      || str == "on the stool" || str == "in the chair" )
      {
      write( "You sit " + str + ".\n" );
      say( PNAME + " sits down.\n" );
      THISP -> set_title( THISP->query_title() + "[sitting]" );
      return 1;
      }
    if( str == "in chair" )
      {
      write( "You sit in the chair.\n" );
      say( PNAME + " sits down in a chair.\n" );
      THISP -> set_title( THISP->query_title() + "[sitting]" );
      return 1;
      }
    if( str == "on stool" )
      {
      write( "You sit on the stool.\n" );
      say( PNAME + " sits down on a stool.\n" );
      THISP -> set_title( THISP->query_title() + "[sitting]" );
      return 1;
      }
    return 1;
    }
  write( "You are already sitting down!\n" );
  return 1;
  }
 
query_exit_ok()
  {
  string tietal;
  if( sscanf( THISP->query_title(), "%s[sitting]", tietal ) )
    {
    THISP->set_title( tietal );
    write( "You pull yourself to your feet.\n" );
    say( strformat( PNAME + " pulls " + objective(THISP) +
      "self to " + possessive(THISP) + " feet." ) );
    return 0;
    }
  return 0;
  }
 
void extra_create()
  {
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
    "The faint sounds of some sort of jazz music is barely audible "
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
    ]));
  set( "invis_exits", ([
    "west"  : "stock",
    "up"    : "@stage",
    "north" : "@stage",
    "stage" : "@stage",
    ]));
  set( "reset_data", ([
    "pete" : NPC "pete",
    "echo" : BASIC "shop_echo",
    ]) );
  set( "day_light", 60 ); 
  set( InsideP, 1 );
  }
 
void extra_init()
{
  add_action( "sit_down", "sit" );
  add_action( "stand_up", "stand" );
}
 
stage()
  {
  write( "You step up onto the stage.\n" );
  tell_room( STAGE, PNAME + " steps up onto the stage.\n",
    ({ present( "echo", FINDO( STAGE ) ), THISP }) );
  tell_room( THISO, PNAME + " steps up onto the stage.\n",
    ({ present( "echo", THISO ), THISP }) );
  move_object( THISP, STAGE );
  command( "glance", THISP );
  return 1;
  }
 
east()
  {
  write( "You push the door open and step outside.\n" );
  say( PNAME + " pushes open the front door and steps outside.\n" );
  tell_room( STREET, PNAME + " steps out of the Posh Perko Pit, "
    "to the west.\n" );
  move_object( THISP, STREET );
  command( "glance", THISP );
  return 1;
  }
