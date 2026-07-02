/*
**  written by Hannah on 11/92
*/

inherit MonsterCode;
inherit MonsterTalk;

#define MY_WEAPON  WEAPONDIR + "blunt/chain"


void extra_create()
{
   string Subject;
   object Weapon;

   set_name( "villager" );
   add_alias( "people" );
   add_alias( "person" );
   set_short( "a villager" );
   if( random( 2 ) ) {
      set_gender( "male" );
      Subject = "He";
   }
   else {
      set_gender( "female" );
      Subject = "She";
   }
   set_long(
      "This is a typical citizen of Rainbow Village.  " + Subject +
      " smiles at everyone, and appears to be content with life." );
   set_race( "human" );
   set_natural_ac( 1 );
   set_alignment( GOOD_AL );
   set_offensive_level( 8 );
   set_stat( "str", 14 );
   set_stat( "int", 19 );
   set_stat( "wil", 10 );
   set_stat( "con", 13 );
   set_stat( "dex", 17 );
   set_stat( "chr", 20 );
   add_money( 20 + random( 50 ) );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_phrase( "The villager says: Hello!" );
   add_phrase( "The villager says: It's a wonderful day, isn't it?" );
   add_combat_phrase(
      "The villager cries: How could you do such a thing?!?" );

   Weapon = clone_object( MY_WEAPON );
   move_object( Weapon, THISO );
   wield_weapon( Weapon );
}
