//  Genious: tanjerra.c  (shopkeeper)
//  Written by Hannah on 5/94

inherit MonsterCode;
inherit MonsterTalk;

#define WEAP  WEAPONDIR + "edged/long_sword.c"
#define ARMR  ARMORDIR + "breastplates/brigandine_short_shirt"


void extra_create()
{
   object tmp;

   seteuid( "genious_member" );
   set_name( "tanjerra" );
   add_alias( "armorer" );
   add_alias( "shopkeeper" );
   set_short( "Tanjerra the armorer" );
   set_long(
      "This is the armorer for Rainbow Village.  She appears tougher "+
      "than most of the village's denizens.  Her long, auburn hair is "+
      "kept tidy in one large braid.  She returns your gaze with "+
      "hazel eyes and smiling countenance." );
   set_race( "human" );
   set_gender( "female" );
   set_natural_ac( 5 );
   set_alignment( GOOD_AL );
   set_offensive_level( 14 );
   set_defensive_level( 18 );
   set_stat( "str", 27 );
   set_stat( "int", 29 );
   set_stat( "wil", 28 );
   set_stat( "con", 23 );
   set_stat( "dex", 27 );
   set_stat( "chr", 30 );
   set_skill( "dodge", 30 );
   set_proficiency( "heavy club", 30 );
   add_money( 20 + random( 30 ) );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_phrase( "Tanjerra says: Hello." );
   add_phrase( "Tanjerra smiles at you." );
   add_phrase( "Tanjerra checks her current inventory of armor." );
   add_combat_phrase( "Tanjerra shouts: I will make you suffer, Evil One!" );

   tmp = clone_object( WEAP ); move_object( tmp, THISO ); wield_weapon( tmp );
   tmp = clone_object( ARMR ); move_object( tmp, THISO ); wear_armor( tmp );
}
