/*
**  written by Hannah on 12/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   set_name("dealer");
   add_alias("drug dealer");
   set_short("a drug dealer");
   set_long(
"This is a pathetic-looking drug dealer.  He seems to be desperate for some\n"+
"sales.\n"
   );
   set_gender("male");
   set_race("human");
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   set_natural_ac(1);
   set_alignment("malicious");
   set_offensive_level(10);
   set_stat("str", 18);
   set_stat("int", 22);
   set_stat("wil", 10);
   set_stat("con", 13);
   set_stat("dex", 20);
   set_stat("chr", 10);

   add_money(50 + random(10));

   set_chat_chance(30);
   set_chat_rate(30 + random(10));
   add_phrase(
      "The drug dealer's hands shake as he tries to give himself a fix.\n");
   add_phrase(
      "The drug dealer says, \"Life sucks.  Wanna buy some blow to make it"+
      " better?\"\n");
   add_combat_phrase(
     "The drug dealer cries, \"No!  I won't tell you where my stash is!\"\n");
}
