inherit ThingCode;
#include "/zone/null/eternal/bus/bus.h"
 
string month;
int year;
 
create() {
  ::create();
  set("id", ({ "pass", "bus pass", "EC bus pass" }));
  set("short", "an EC bus pass");
  set("long", "bus pass");
  set("value", 0); }
 
init() {
  ::init();
  add_action("do_flash", "flash"); }
 
long() { return strformat("This is a pass you can use to ride the Eternal "
    "City commuter bus for the month of "+query_month()+", "+
    query_year()+".  Just <flash pass> when you board the bus.\n"); }
 
 
do_flash(string str) {
  if(!str || str!="pass") {
    notify_fail("Flash what?\n");
    return 0; }
  if(load_name(ENV(THISP))!=BUS) {
    write("A lot of good that'll do you when you're not even on the "
      "bus.\n");
    return 1; }
  write("You flash your pass to the driver.\n");
  DRIVER->get_pass(THISO);
  return 1; }
 
setup_pass() {
  month = ClockObject->query_month_s();
  year = ClockObject->query_year(); 
  return 1; }
 
query_move_ok(object dest, object callboy) { 
  if(load_name(previous_object())=="/obj/races/death/default")
    return 1;
  return 0; }
 
query_month() { return month; }
query_year() { return year; }
