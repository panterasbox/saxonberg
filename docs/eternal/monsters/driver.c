#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
#include "/zone/null/eternal/bus/bus.h"
#include "path.h"
  
string *pending;
 
create() {
  ::create();
  if(clonep(THISO)) destruct(THISO);
  pending = ({});
  set_name("amos");
  add_alias("amos jenkins");
  add_alias("jenkins"); 
  add_alias("driver");
  add_alias("bus driver");
  set_race("human");
  set_short("Amos Jenkins");
  set_long("Up at the wheel is an elderly black man named Amos "
    "Jenkins.  He's hopped from job to job most of his life and he's "
    "spending his golden years driving the Eternal City Bus."); }
 
get_money(object cust) {
  if(cust->query("sake")) {
    command("say You got sum nerve showin' yo face on MAH bus.  Git da "
      "hell off!");
    cust->move_player("&&", ENV(ENV(THISO)));
    tell_room(ENV(THISO), "Amos boots "+cust->query_name()+" off "
      "the bus.\n"); 
    tell_room(ENV(cust), PNAME+" gets booted off the bus.\n", 
      ({THISP})); 
    return 1; }
  tell_object(cust, "Amos tells you: That'll be "+FARE+" coins.\n");
  pending += ({cust->query_real_name()});
  call_out("bootem", 15, cust); }
 
fight(object bully) {
  set("kicking ass", 1);
  bully->set("sake", 1);
  bully->save_me();
  tell_room(ENV(THISO), "Amos reaches under the dashboard "
    "and pulls out a .357.\n");
  command("say I SAY BITCH BE COO!");
  call_out(#'tell_room, 1, ENV(THISO), strformat("The driver points the "
    "gun at "+bully->query_name()+"'s head and unloads a gullet full " 
    "of lead.\n"), ({bully}));
  call_out(#'tell_object, 1, bully, strformat("The driver points the "
    "gun at your head and unloads a gullet full of lead.\n"));
  call_out(#'call_other, 2, bully, "DeathSequence", THISO, "by gunshot");
  call_out("kick_corpse", 3, bully);
  call_out(#'command, 4, "say buncha GODDAMN savages in this town");
  return; }
 
kick_corpse(object bully) {
  object corpse;
  corpse=clone_object("/obj/races/death/corpse");
  corpse->setupCorpse(bully->query_name(), "by gunshot");
  move_object(corpse, ENV(ENV(THISO))); 
  destruct(bully);
  tell_room(ENV(THISO), "Amos kicks "+
    explode(corpse->short(), " ")[sizeof(explode(corpse->short(), " "))-1]+
    "'s lifeless body out the door.\n");
  tell_room(ENV(ENV(THISO)), strformat(corpse->short()+" flies out "
    "of the bus as it drives by.\n"));
  set("kicking ass", 0); }
 
  
bootem(object cust) {
  if(member(pending, cust->query_real_name())!=-1) {
    tell_object(cust, strformat("Amos tells you: Ah ain't got all "
      "day boah!  Git yo' ass of mah bus.\n"));
    cust->move_player("&&", ENV(ENV(THISO)));
    tell_room(ENV(THISO), "Amos boots "+cust->query_name()+" off "
      "the bus for not paying.\n"); }
    tell_room(ENV(cust), PNAME+" gets booted off the bus.\n", ({THISP}));
  pending-=({PRNAME}); 
  return 1; }
 
enter_signal(object item, object oldenv, object callboy, int passed) {
  if(member(pending, PRNAME)==-1) {
    call_out(#'command, 1, "say Well now, t'aint everyday ah git a tip!");
    call_out(#'command, 1, "thank "+PRNAME);
    return 1; }
  if(!intp(item->query(MoneyP))) {
    call_out(#'write, 1, strformat("Amos tells you: Ah don't want yo' toys, "
      "gimme mah money o' be movin' along...\n")); 
    "/secure/player/commands/give.c"->give_item(THISO, item, THISP); }
  if(item->query(MoneyP)<FARE) {
    call_out(#'write, 1, strformat("Amos tells you: Ah said it costs 50 "
      "coins wot'r ya deaf son?\n")); 
    "/secure/player/commands/give.c"->give_item(THISO, item, THISP); }
  if(item->query(MoneyP)==FARE) {
    call_out(#'command, 1, "thank "+PRNAME); 
    pending-=({PRNAME}); }
  if(item->query(MoneyP)>FARE) {
    call_out(#'command, 1, "say Well now, t'aint everyday ah git a tip!");
    call_out(#'command, 1, "thank "+PRNAME); 
    pending-=({PRNAME}); } }
 
get_pass(object pass) {
  if(member(pending, PRNAME)==-1) {
    write("Amos ignores you.\n");
    return 0; }
  if(pass->query_month()!=ClockObject->query_month_s() &&
     pass->query_year()!=ClockObject->query_year()) {
    write(strformat("Amos tells you: Mah 'pologies, but dat der pass "
      "dun gone an' expired on ya.\n")); 
    return 0; }
  else {
    write(strformat("Amos tells you: Well now, a regular...  You go "
      "have yo'self a seat.\n")); 
    pending-=({PRNAME});
    return 1; } } 

noboot() { return remove_call_out("bootem"); }
