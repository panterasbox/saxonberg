/*
**  written by Hannah on 12/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   set_name("dog");
   add_alias("rabid dog");
   set_short("a rabid dog");
   set_long(
"Once a happy rotweiler, this is a very distressed dog.  He looks at you\n"+
"with eyes full of malice, and mouth full of foam.\n");
   set_race("animal");
   set_gender("male");
   set_natural_ac(1);
   set_alignment("malicious");
   set_damage_bonus(1);
   set_hit_bonus(1);
   set_offensive_level(12);
   set_type("edged");
   set_stat("str", 20);
   set_stat("int", 7);
   set_stat("wil", 12);
   set_stat("con", 15);
   set_stat("dex", 24);
   set_stat("chr", 5);
   add_combat_message("bury your sharp teeth into",
                      "buries his sharp teeth into");

   set_chat_chance(30);
   set_chat_rate(30 + random(10));
   add_phrase("The rabid dog froths at the mouth.\n");
   add_phrase("The rabid dog growls at you menacingly.\n");
}
