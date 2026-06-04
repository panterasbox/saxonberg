inherit MonsterCode;
inherit SpecialAttackCode;
 
#include "path.h"
inherit BobCode;
#include "pete_sell.h"
#include "pete_combat.h"
#include "pete_poem.h"
int waiting;

// pete.mov    - standard shopkeeping
// <drink>.mov - drink preperation
// pete2.mov   - banter with poet before poem reading
// pete3.mov   - look around for poet
// pete4.mov   - listen to poetry
// pete5.mov   - post-poem poet banter
// pete6.mov   - post-pkill talk with poet
// pete7.mov   - thanks poet and gives him some espresso
// pete8.mov   - tongue-lashing directed at any who attack him
 
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
    "with a price too terrible for any ordinary mortal man..." );
  set_race( "human" );
  set_gender( "male" );
  add_special_attack( "kick_ass_attack", THISO, 99 );

  waiting=1;
  mp_setup( NPC "pete" );

  set( "customer", 0 );
  set( "last_mp", NPC "pete" );
  set( "stopper", 0 );
  set( "punkass", 0 );
  }
 
void extra_init()
  {
  add_action( "buy_item", "buy" );
  add_action( "buy_item", "order" );
  add_action( "buy_item", "purchase" );
  add_action( "quikpoem", "quikpoem" );
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

query_pete_in_shop()
  {
  if( !present( "shop echo", ENV(THISO) ) )
    {
    command( "emote leaves.", THISO );
    move_object( THISO, SHOP );
    command( "emote arrives.", THISO );
    }
  return 0;
  }
