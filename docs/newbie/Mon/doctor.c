//  Genious: newbie/good07.c
//  Written by Hannah on 12/92
//
//  The doctor hands out one jar of healing potion (per 2 resets) to each
//  player of alignment >= GOOD_AL that walks in.

inherit MonsterCode;
inherit MonsterTalk;
#include "NewbieDir.h"

#define POTION  NEWBIE_DIR + "Obj/doctor_potion"

string *potion_list;
int     reset_count;


void extra_create()
{
   seteuid( "genious_member" );
   set_name( "doctor" );
add_alias("doc");
   set_short( "a doctor" );
   set_long(
      "This is the doctor of Rainbow Village.  She is wearing a little white "+
      "lab coat and smiles happily at all her patients.  She will offer a "+
      "free jar of healing potion to those patients who are mostly good at "+
      "heart." );
   set_race( "human" );
   set_gender( "female" );
   set_natural_ac( 2 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   set_alignment( GOOD_AL );
   set_offensive_level( 5 );
   set_damage_bonus( 1 );
   set_hit_bonus( 1 );
   set_type( "blunt" );
   set_stat( "str", 24 );
   set_stat( "int", 27 );
   set_stat( "wil", 12 );
   set_stat( "con", 15 );
   set_stat( "dex", 14 );
   set_stat( "chr", 20 );
   set_skill( "dodge", 2 );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_phrase( "The doctor looks at some charts." );
   add_phrase( "The doctor mixes up another elixir." );

   reset_count = 0;
   move_object( clone_object( POTION ), THISO );
}


void extra_init()
{
   call_out( "hand_out", 5, THISP );
}


void extra_reset()
{
   if( !reset_count )
      potion_list = ({ });
   reset_count++;
   if( reset_count > 1 )
      reset_count = 0;
}


/*
**  Search the player and all containers for a jar of healing potion.
*/
status potion_exists( object ob )
{
   object *InvItems;
   int     i;

   InvItems = deep_inventory( ob );
   for( i = 0; i < sizeof( InvItems ); i++ )
      if( InvItems[ i ]->query_doctor_potion() )
         return 1;
   return 0;
}


void hand_out( object this_p )
{
   if( ( ( int )this_p->query_alignment() < GOOD_AL ) ||
       potion_exists( this_p ) ||
       ( ( sizeof( potion_list ) > 0 ) &&
         ( searcha( potion_list, this_p->query_real_name() ) != -1 ) ) ||
       ( ENV( this_p ) != ENV( THISO ) ) )
      return;
   potion_list += ({ ( string )this_p->query_real_name() });
   move_object( clone_object( POTION ), this_p );
   tell_room( ENV( THISO ),
              sprintf( "The good doctor hands %s a jar of healing potion.\n",
                       this_p->query_name() ),
              ({ this_p }) );
   tell_object( this_p,
                "The good doctor hands you a jar of healing potion.\n" );
}
