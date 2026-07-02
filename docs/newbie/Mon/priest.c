//  Genious: priest.c
//  Written by Hannah on 11/92

inherit MonsterCode;
inherit MonsterTalk;
#include "../../GPaths.h"

#define BOOK  NEWBIE + "Obj/holy_book"


void extra_create()
{
   seteuid( "genious_member" );
   set_name( "priest" );
   add_alias( "non-denominational priest" );
   set_short( "a non-denominational priest" );
   set_long(
      "This is a priest, a religious man of no religion in particular.  He "+
      "is wearing a gray outfit, and seems to be reading a book." );
   set_race( "human" );
   set_gender( "male" );
   set_natural_ac( 2 );
   set_alignment( VERY_GOOD_AL );
   set_offensive_level( 6 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   set_damage_bonus( 1 );
   set_hit_bonus( 1 );
   set_heal_rate( 30 );
   set_heal_amount( 2 );
   set_type( "blunt" );
   set_stat( "str", 14 );
   set_stat( "int", 25 );
   set_stat( "wil", 12 );
   set_stat( "con", 15 );
   set_stat( "dex", 15 );
   set_stat( "chr", 25 );
   set_skill( "dodge", 5 );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_phrase( "The priest smiles and says: Bless you." );
   add_phrase( "The priest turns a page in his book." );

   move_object( clone_object( BOOK ), THISO );
}
