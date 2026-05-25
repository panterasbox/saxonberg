inherit MonsterCode;
inherit SpecialAttackCode;
 
#include "path.h"
#include BobCode
 
// pete.mov    - standard shopkeeping
// <drink>.mov - drink preperation
// pete2.mov   - banter with poet before poem reading
// pete3.mov   - look around for poet
// pete4.mov   - listen to poetry
// pete5.mov   - post-poem poet banter
 
void extra_create()
  {
  set_name( "Pete" );
  add_alias( "pete" );
  add_alias( "perko" );
  add_alias( "24601" );
  add_alias( "perko pete" );
  set_short( "Perko Pete" );
  set_long(
    "The moment you look at this fellow, you say to yourself, "
    "\"Wow!  This man, he KNOWS coffee!\" for the art of "
    "coffeemaking hangs like an aura of power around him.  But "
    "then, that is to be expected; trained by the reclusive "
    "Cashiid al-Suun monks of Persia, the long years of deep "
    "study, the dark rituals, the forbidden knowledge...  Yes, "
    "Pete is one with The Coffee, but he has paid for that kinship "
    "with a price too terrible for any ordinairy mortal man..." );
  set_race( "human" );
  set_gender( "male" );

  mp_setup( NPC "pete" );
  set( "customer", 0 );
  set( "last_mp", NPC "pete" );
  }
 
void extra_init()
  {
  add_action( "buy_item", "buy" );
  add_action( "buy_item", "order" );
  add_action( "buy_item", "purchase" );
  }
 
buy_item( string str )
  {
  string drinkprog;
  int cost;
  if( query( "customer" ) && query( "customer" ) != THISP )
    {
    write( "Pete seems to be busy at the moment.\n" );
    return 1;
    }
  switch( str )
    {
    case "hot chocolate" :
    case "chocolate" :
    case "hot cocoa" :
    case "cocoa" :
      drinkprog = "cocoa";
      cost = 10;
      break;
    case "hot tea" :
    case "tea" :
    case "earl gray" :
    case "earl grey" :
      drinkprog = "tea";
      cost = 15;
      break;
    case "joe" :
    case "java" :
    case "coffee" :
      drinkprog = "coffee";
      cost = 15;
      break;
    case "espresso" :
      drinkprog = "espresso";
      cost = 25;
     break;
    case "latte" :
    case "cafe latte" :
      drinkprog = "latte";
      cost = 35;
      break;
    default :
      drinkprog = "nodrink";
      cost = 0;
      break;
    }
  command( "say Hey Pete!  Gimme some " + str + "!", THISP );
  if( query("customer") == THISP )
    {
    command( "say Whoa.. hold your horses!  One drink at "
      "a time!", THISO );
    return 1;
    }
  if( THISP->query_money() < cost )
    {
    command( "say This isn't a charity organization..", THISO );
    command( "say You'll need " + cost + " coins to buy " 
      + drinkprog + ".", THISO );
    return 1;
    }
  set( "customer", THISP );
  command( "give " + cost + " coins to 24601", THISP );
  mp_setup( COFFEE + drinkprog );
  return 1;
  }
 
load_rack()
  {
  object rack;
  if( objectp( rack = present( "mug rack", ENV(THISO)) ) )
    rack -> create();
  return 0;
  }

basic_mp()
  {
  set( "customer", 0 );
  mp_setup( NPC "pete" );
  set( "last_mp", NPC "pete" );
  return 1;
  }
 
query_ok_by_pete()
  {
  return( "hell yeah!" );
  }
 
give_drink()
  {
  object drink;
  string blah, what;
  sscanf( query_mp(), "%s/coffee/%s", blah, what );
  drink = clone_object( COFFEE + what );
  move_object( drink, THISO );  
  command( "give " + what + " to " + 
    query( "customer" ) -> query_real_name(), THISO );
  set( "customer", 0 );
  mp_setup( query("last_mp") );
  return 0;
  }
