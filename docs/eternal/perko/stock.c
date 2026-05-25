inherit RoomPlusCode;
 
#include <ansi.h>
#include "path.h"
 
string *rooms;
 
void extra_create()
{
  set( "ansi_short", YEL + "The Perko Pit Stockroom" );
  set( "short", "The Perko Pit Stockroom" );
  set( "day_color", YEL );
  set( "day_long", 
    "You are standing in the back room of the Posh Perko "
    "Pit.  A single, bare bulb hangs down on a wire to "
    "illuminate the dusty, metal shelves upon which rest "
    "the materials Pete needs to run his shop.  A doorway "
    "leads back into the shop to the east.  "
//  "There is a simple lever on the wall.  Looks like a "
//  "breaker of some sort."
    );
  set( "day_light", 60 );
  set( "exits", ([
    "east" : SHOP,
    ]) );
  set( "perm_exit_msg", "" );
  set( InsideP, 1 );
  rooms=({
    "perko/stock", "bodyshop","clothiers","garage",
    "goldcross","library","operations","oracle_room",
    "perko/stage","perko/shop","shop1","shop2","shop3",
    "stat_room1","lounge/lounge","lounge/gameroom",
    "videoshop","vidlounge"
    });
}
 
void extra_init()
  {
//  add_action("switch_light","pull");
  }
 
switch_light(string str)
  {
  string message;
  int lightto, x;
  if(str!="lever")
    return 0;
  if(THISO->query("day_light")==0)
    {
    message="With a click, the lights flicker on.\n";
    lightto = 60;
    }
  else
    {
    message="With a soft click, the lights flicker out.\n";
    lightto = 0;
    }
  for(x=0;x<sizeof(rooms);x++)
    {
    tell_room("/zone/null/eternal/"+rooms[x],message);
    ("/zone/null/eternal/"+rooms[x])->
      set("day_light",lightto);
    }
  return 1;
  }
