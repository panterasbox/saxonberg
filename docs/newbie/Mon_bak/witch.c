/*
**  written by Hannah on 11/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   set_name("witch");
   set_short("a hunchbacked witch");
   set_long(
"This is an evil-looking witch, dressed in dirty rags.  She smiles at you\n"+
"with a gap-toothed grin.\n"
   );
   set_race("human");
   set_gender("female");
   set_alignment("malicious");
   set_natural_ac(2);
   set_damage_bonus(1);
   set_hit_bonus(1);
   set_type("blunt");
   set_stat("str", 24);
   set_stat("int", 27);
   set_stat("wil", 12);
   set_stat("con", 15);
   set_stat("dex", 14);
   set_stat("chr", 10);

   set_chat_chance(90);
   set_chat_rate(30 + random(10));
   add_combat_message("hit", "hits");
   add_phrase("The hunchbacked witch casts a stony glance at you.\n");
   add_phrase("The hunchbacked witch stirs the bubbling brew.\n");
   add_phrase(
      "The hunchbacked witch says, \"I still need one more ingredient.\"\n");
}
