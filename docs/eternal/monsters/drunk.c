/*
**  The Drunk
**  Mods made by Walker, using a tweaked version of Min's code.
*/
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterTalk;
inherit MonsterMove;
inherit SpecialAttackCode;
#include "path.h"
 
int check;
 
stndrdth( int i )
  {
  switch(i%10)
    {
    case 1:
      if( i == 11 )
        return( to_string(i) + "th" );
      else
        return( to_string(i) + "st" );
    case 2:
      if( i == 12 )
        return( to_string(i) + "th" );
      else
        return( to_string(i) + "nd" );
    case 3:
      if( i == 13 )
        return( to_string(i) + "th" );
      else
        return( to_string(i) + "rd" );
    default:
      return( to_string(i) + "th" );
    }
  }
 
void extra_create()
  {
  set_name( "Chuck the Drunkard" );
  add_alias( "kender" );
  add_alias( "chuck" );
  add_alias( "man" );
  add_alias( "drunk" );
  add_alias( "drunkard" );
  add_alias( "chuck the drunkard" );
  set_short( "Chuck the Drunkard" );
  set_long(
    "This kender seems to emanate good cheer as he stumbles "
    "about, a huge bottle of Goldenschlager clutched in one "
    "grimy hand.  You know that his name is Chuck because it "
    "has been tattoed across his forehead." );
  set_race( "kender" );
  set_gender( "male" );
  set_alignment( 2875 );
  set_toughness( 30 );
  set_chat_chance( 80 );
  set_chat_rate( 40 );
  add_phrase( "Chuck the Drunkard burps." );
  add_phrase( "Chuck the Drunkard sways like a drunkard." );
  add_phrase( "Chuck the Drunkard says: A happy " +
    ClockObject->query( "month_s" ) + " " +
    stndrdth( ClockObject->query( "day" ) ) + " to ye on this fyne " +
    ClockObject->query( "season" ) + " " +
    ClockObject->query( "timestring" ) + "!" ); 
  set_move_rate( 60 );
  set_move_chance( 50 );
  add_special_attack( "thwack", THISO, 80 );
  check = 0;
  }
 
thwack( object victim, object attacker )
  {
  tell_room( ENV( THISO ), strformat( "Chuck the Drunkard "
    "collapses in a soggy, drunken heap.\n" ) );
  tell_player( victim, "You win!" );
  tell_room( ENV( THISO ), victim->query_name()+" wins!\n", ({ victim }) );
  full_clear_attack();
  victim -> remove_target( THISO );
  set_chat_rate( 1000 );
  set_move_chance( 0 );
  set( NoCombatP, 1 );
  set_short( "Chuck the Drunkard [almost certainly dead]" );
  call_out( "wakin_back_up", 15, victim );
  return 1;
  }
 
wakin_back_up( object victim ) 
  {
  set_chat_rate( 40 );
  set_move_chance( 50 );
  remove_prop( NoCombatP );
  set_short( "Chuck the Drunkard" );
  tell_room( ENV( THISO ), strformat( "Chuck the Drunkard "
    "picks himself up, blinking blearily.\n" ) );
  tell_room( ENV( THISO ), strformat( "Oh man.. I need "
    "a drink..", "Chuck the Drunkard says: " ) );
  if( present( victim) )
    {
    tell_room( ENV( THISO ), strformat( victim -> query_name() +
      " looks confused." ), ({ victim }) );
    tell_object( victim, "You feel confused.\n" );
    }
  return 1;
  }
