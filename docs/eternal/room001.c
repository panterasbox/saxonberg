//  room001.c
 
inherit RoomPlusCode;
 
#include "/zone/null/eternal/eternal.h"
#define SHOP "/zone/null/eternal/perko/shop"
 
void extra_create()
{
    set( "map_symbol", "t" );
    set( "map_extras", ([
        "west" :  ({ "P", 0, 0 }), 
        "north" : ({ "?", 0, 0 }) 
    ]) );
    set( "short", "Tanelorn Road, Bend" );
    set( "day_long",
      "This is where Tanelorn Road bends in to the south "
      "and east directions.  The coarse, gem-like gravel "
      "surface is quite deep, and a large pile of unused "
      "gravel lies in the corner of this bend.  Directly "
      "to the west is a lot that is currently being "
      "developed." );
    set( "exits", ([
      "east": "room002",
      "west": "@west_thing",
      "south": "room006",
    ]) );
    set( "day_light", SUNLIGHT );
    set( "night_light", DARK );
    set( OutsideP, 1 );
    set( "reset_data", ([
      "worker" : "/zone/null/eternal/monsters/worker",
    ]) );
    set( "descs", ([
      ({ "gravel", "black gravel", "road", "rock", "black rock",
         "coarse gravel", "gem-like gravel" }):
          "The black gravel surfacing the road is nothing more "
          "than finely crushed black rock.",
      ({ "gem", "gems" }):
          "Only gem-LIKE gravel; not ACTUAL gems you silly.  The "
          "gravel glitters like gems or somesuch.",
      ({ "roofing", "roof" }):
        "It looks like only quality Armstrong roofing is going "
        "onto this place.",
      ({ "construction", "building", "lot", "site",
        "construction site" }):
          "It looks like a small building is having its roofing "
         "done on the construction site.  Should open soon..",
      ({ "frame", "wooden frame", "building" "room", "small room"}):
          "The building looks as though it will be fairly small, "
          "with a main room close to the road and a small room "
          "in the back.",
    ]) );
    set( "patrol1", ({"east","south",1})  );
    set( "patrol2", ({"east","east",0})   );
    set( "patrol3", ({"south","south",0}) );
    set( "heart",   ({"east","south",8})  );
}

void
extra_init()
{
    add_action("gravel_pickup","get");
    add_action("gravel_pickup","take");
}

gravel_pickup(string str)
{
    if(!str){ write( capitalize(query_verb()) + " what?\n" ); return 1; }
    if( searcha( ({"gravel","black gravel","rock","black rock",
      "coarse gravel","gem-like gravel"}), str ) == -1 )
      return 0;
    write( strformat( "As you move to " + query_verb() + " some of the "
      + str + ", the pile suddenly jumps out of your reach!  How odd!" ) );
    say( strformat( "As " + PNAME + " moves to " + query_verb() + " some "
      "of the " + str + ", the pile suddenly jumps out of " +
      possessive(THISP) + " reach!  How odd!" ) );
    return 1;
}

west_thing()
{
  string formality;
  string return_val = 0;
  
  
  switch( THISP->query_gender() )
  {
    case("male") :   formality = " sir, ";   break;
    case("female") : formality = " ma'am, "; break;
    default :        formality = ", ";       break;
  }
  
  if(!present("worker",THISO))
  {
    write( "You push your way into the welcome warmth of the coffee shop..\n" );
    say( PNAME + " pushes " + possessive(THISP) + " way into the "
      "coffee shop to the west.\n" );
    //move_object( THISP, SHOP );
    tell_room( SHOP, PNAME + " pushes " + possessive(THISP) + " way into "
      "the shop from the street.\n", ({THISP}) );
    //command( "glance", THISP );
    return SHOP;
  }
  if( THISP->query_ok_by_pete() == "hell yeah!" 
    || THISP->query_wizard()  )
  {
    command( "say Hello" + formality + "go right on in.",
      present( "worker", THISO ) );
    write( "You push your way into the welcome warmth of the coffee shop.\n" );
    say( PNAME + " pushes " + possessive(THISP) + " way into the "
      "coffee shop to the west.\n" );
    //move_object( THISP, SHOP );
    tell_room( SHOP, PNAME + " pushes " + possessive(THISP) + " way into "
      "the shop from the street.\n", ({THISP}) );
    //command( "glance", THISP );
    return SHOP;
  }
  tell_room( ENV(THISP), strformat( "The construction worker "
    "blocks " + PNAME + " as " + subjective(THISP) + 
    " attempts to enter the construction site." ), ({THISP}) );
  write( "You are blocked by the construction worker.\n" );
  command( "say I'm sorry" + formality + "but that area is "
    "restricted to project associates or people who can kick my ass only.", 
    present( "worker", THISO ) );
  return 0;
}
