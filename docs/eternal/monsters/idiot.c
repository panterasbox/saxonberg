/*
**  Drooling Idiot
**  Mods made by Walker, using a tweaked version of Min's code.
*/
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterTalk;
inherit MonsterMove;
inherit SpecialAttackCode;
 
void extra_create()
  {
  set_name( "idiot" );
  add_alias( "man" );
  set_short( "a drooling idiot" );
  set_long(
    "This was probably once a man of modest stature, but "
    "has now been reduced to nothing but an idiot who "
    "cannot even control his own drooling by the shock "
    "he must have encountered upon arrival to this strange, "
    "yet wonderful city.  His unfocusing eyes perpetually "
    "stare off into the distance somewhere behind you." );
  set_race( "human" );
  set_alignment( 20 );
  set_type( "blunt" );
  set_toughness( 30 );
  set_chat_chance( 25 );
  set_chat_rate( 40 );
  add_phrase( "Idiot drools disgustingly all over himself!\n" );
  add_phrase( "Idiot drools disgustingly all over you!\n" );
  add_money( random( 5 ) + 1 );
  set_move_rate( 60 );
  set_move_chance( 50 );
  add_special_attack( "blatant_miss", THISO, 80 );
  }
 
blatant_miss( object victim, object attacker )
  {
  tell_room( ENV( THISO ), strformat( "Idiot, completely "
    "oblivious to the attempt being made on his life, steps "
    "to the side to look at a rock just as " + 
    victim -> query_name() + " takes a swing at him." ), 
    ({ victim }) );
  tell_object( victim, strformat( "Idiot, completely "
    "oblivious to the attempt being made on his life, steps "
    "to the side to look at a rock just as you take a swing "
    "at him." ) );
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
  tell_room( ENV( THISO ), strformat( victim -> query_name() + 
    ", still being carried forward by the momentum of " +
    possessive( victim ) + " attack, stumbles and falls on " +
    possessive( victim ) + " side.\n" + victim -> query_name() +
    " pulls " + objective( victim ) + "self to " +
    possessive( victim ) + " feet, a pained and embarassed "
    "expression on " + possessive( victim ) + " face." ), 
    ({ victim }) );
  tell_object( victim, strformat( "Still being carried forward "
    "by the momentum of your attack, you stumble and fall "
    "on top of your " + item -> query( "name" ) + ".\nYou pull "
    "yourself back to your feet, wincing in pain, and bright "
    "red with embarassment." ) ); 
  damage = random( 5 ) + 1;
  victim -> take_damage( damage, victim -> get_hit_loc(), 
    "psychic", THISO );
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
