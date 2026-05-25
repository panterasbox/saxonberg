/*
**  Soothsayer
**  Mods made by Walker, using a tweaked version of Min's code.
*/
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterTalk;
inherit MonsterMove;
inherit SpecialAttackCode;

#include "path.h"
 
void extra_create()
  {
  set_name( "soothsayer" );
  add_alias( "man" );
  add_alias( "old man" );
  set_short( "a wild-haired old man" );
  set_long(
    "This is the Soothsayer, from that old play, Julius Caeser, "
    "by William Shakespeare.  Ever since Shakespeare died, "
    "he's been doing odd jobs here and there \(most notably "
    "MacBeth witch impersonations\), then finally decided to "
    "settle down in Eternal City and start up the "
    "insane man/prophecy business again." );
  set_race( "human" );
  set_gender( "male" );
  set_alignment( 2875 );
  set_toughness( 30 );
  set_chat_chance( 25 );
  set_chat_rate( 40 );
  add_phrase( "The Soothsayer babbles incoherently to himself.\n" );
  add_phrase( "The Soothsayer's eyes suddenly go completely "
    "blank.\n" );
  add_phrase( "The Soothsayer gets an odd look of sadness on "
    "his face.\n");
  add_phrase( "The Soothsayer chuckles like a crazy old man.\n" );
  add_phrase( "The Soothsayer whispers to you: There are some "
    "who say that Dave the Dragon is not really dead...\n" );
  add_phrase( "The Soothsayer says: Beware the Ides of March!\n");
  set_move_rate( 60 );
  set_move_chance( 50 );
  add_special_attack( "blatant_miss", THISO, 80 );
  }
 
blatant_miss( object victim, object attacker )
  {
  tell_room( ENV( THISO ), strformat( "The Soothsayer "
    "keels over dead!\n" ) );
  THISO -> full_clear_attack();
  victim -> remove_target( THISO );
  trip_up( victim );
  return 1;
  }
 
int trip_up( object victim ) 
  {
  object *inv, item;
  int damage;
  if( !present( victim ) )
    return 1;
  inv = inventorya( victim );
  inv = filter_array( inv, "Icheck" );
  item = inv[ random( sizeof( inv ) ) ];
  tell_room( ENV( THISO ), strformat( "The Soothsayer "
    "picks himself up unsteadily.\n" ) );
  tell_room( ENV( THISO ), strformat( "I'm not... "
    "_quite_... dead.", "The Soothsayer says: " ) );
  tell_room( ENV( THISO ), strformat( victim -> query_name() +
    " looks confused." ), ({ victim }) );
  tell_object( victim, "You feel confused.\n" );
  return 1;
  }
 
Icheck( object ob )
  {
  if( !ob->query( "short" ) )
    return 0;
  if( ob->query( InvisP ) )
    return 0;
  else 
    return 1;
  }
