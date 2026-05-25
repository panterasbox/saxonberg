inherit ArmorCode;
#include "../defs.h"

status IsPressed;

void extra_init()
{
   add_action( "press_button", "press" );
}

void extra_create()
{
   set_ids( ({ "vest", "cardboard vest", "armor" }) );
   set_short( "a flimsy cardboard vest" );
   set_long( "This is nothing more than a long piece of cardboard folded "
      "in half with a hole cut out for your head.  It takes a little bit "
      "of imagination to see it as a vest.  It doesn't offer much protection, "
      "but it's better than nothing (maybe).  There is a small brown button "
      "partially hidden under a flap of cardboard." );
   set_descs( (["button" : "A small brown button.  Maybe you could press it" ]) );  
   set_material("paper");
   set_base_ac( 1 );
   set_weight( 100 );
   set( "areas", ({ "chest", "stomach" }) );
}

int press_button( string arg )
{
   object who;
   who=THISP;
   
   if( arg != "button" )
   {
      notify_fail( "Press what?\n" );
      return 0;
   }
   if( IsPressed == 1 )
   {
      write( "You press the button.  Nothing happens.\n" );
      tell_room(environment(who), 
         PNAME+" pokes "+objective(who)+"self.\n", ({who}));
      return 1;
   }
   else
   {
      write( "You press the button and your armor suddenly sprouts arms and a "+
         "metal coating!\n" );
      tell_room(environment(who), PNAME+" pokes "+objective(who)+"self, and "+
         possessive(who)+" armor suddenly looks much better!\n", ({who}) );
      set_short( "a fortified cardboard suit of armor" );
      set_long( "This is a cardboard vest with a hole cut out for your head. "
         "It is fortified with metal plating, and has metal arms.  You have "
         "a feeling that this armor is better than it was before.  There is still "
         "a small brown button partially hidden under a fortified flap." );
      set_material("tin");
      set_base_ac( 3 );
      set( "areas", ({ "chest", "stomach", "right shoulder", "left shoulder", 
         "right arm", "left arm" }) );
      set_weight( 500 );
      add_ids( ({"suit"}) );
      IsPressed = 1;
      return 1;
   }
}
