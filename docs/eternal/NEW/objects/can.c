/*
**  originally coded by Therin, with fixes made by Phretys on 5/93
*/
inherit HealingCode;

// Chnaged healing amounts to reflect portable healin standards.
void setup_next_use()
{
    set("heal_hp", 5);
    set("heal_mana", 5);
    set("heal_ftg", 7);
}


status heal(string arg)
{
   object can;

   if (!id (arg))
      return 0;

   set("action_msg", "Ahh!! Refreshing!",
      PNAME + " drinks something and looks refreshed!");
   can = clone_object( "/zone/null/eternal/lounge/empty_can" );
   move_object( can, ENV( THISO ) );
   return do_heal(arg);
}


void extra_create()
{
   set("id","can");
   add("id","can");
   add("id","pop");
   add("id","soda");
   add("id","soft drink");
   set("short","a soft drink can");
   set("plural","soft drink cans");
   set("id_short","a soft drink can");
   set("long","This is a soft drink can.");
   set("weight", 75);
   set("value", 50);
   setup_next_use();
   set("heal_uses", 1);
   set("heal_action", "drink");
   set( MagicP, 1 );
}
